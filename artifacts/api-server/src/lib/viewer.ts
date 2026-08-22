import { clerkClient, getAuth } from "@clerk/express";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

const DEFAULT_AVATAR_URL =
  "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=160";
const INITIAL_OWNER_EMAIL_DIGEST = "476a0ae289a14c543526355bdd7f928ae0610f66aa8e751b354fb8323799441e";

function cleanUsername(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 28) || "nightshift"
  );
}

function isInitialOwner(clerkEmail: string | undefined): boolean {
  if (!clerkEmail) return false;
  const digest = createHash("sha256").update(clerkEmail.trim().toLowerCase()).digest("hex");
  return timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(INITIAL_OWNER_EMAIL_DIGEST, "hex"));
}

async function provisionViewer(clerkId: string): Promise<User> {
  const clerkUser = await clerkClient.users.getUser(clerkId);
  const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress;
  const emailPrefix = clerkEmail?.split("@")[0];
  const shouldClaimInitialOwner = isInitialOwner(clerkEmail);
  if (shouldClaimInitialOwner) {
    const [claimedOwner] = await db.update(usersTable)
      .set({ clerkId, isAdmin: true, adminRole: "owner" })
      .where(and(eq(usersTable.username, "omito"), isNull(usersTable.clerkId)))
      .returning();
    if (claimedOwner) return claimedOwner;
  }
  const baseUsername = cleanUsername(
    clerkUser.username ?? emailPrefix ?? `nightshift_${clerkId.slice(-8)}`,
  );
  const [usernameTaken] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, baseUsername));
  const username = usernameTaken
    ? `${baseUsername.slice(0, 19)}_${cleanUsername(clerkId).slice(-8)}`
    : baseUsername;
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    emailPrefix ||
    "Nightshift Guest";

  try {
    const [created] = await db
      .insert(usersTable)
      .values({
        clerkId,
        username,
        displayName,
        category: "influencer",
        avatarUrl: clerkUser.imageUrl || DEFAULT_AVATAR_URL,
        bio: "",
        isAdmin: shouldClaimInitialOwner,
        adminRole: shouldClaimInitialOwner ? "owner" : "member",
      })
      .returning();
    return created;
  } catch {
    // Concurrent requests can both attempt the first-time provisioning insert.
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId));
    if (existing) return existing;
    throw new Error("Could not create the signed-in member profile.");
  }
}

export async function getViewer(req: Request): Promise<User | undefined> {
  const clerkId = getAuth(req).userId;
  if (!clerkId) return undefined;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));
  return existing ?? provisionViewer(clerkId);
}

export async function requireViewer(
  req: Request,
  res: Response,
): Promise<User | undefined> {
  const viewer = await getViewer(req);
  if (!viewer) {
    res.status(401).json({ error: "Sign in to continue." });
    return undefined;
  }
  if (viewer.accountStatus === "suspended") {
    res.status(403).json({ error: "This account is currently suspended." });
    return undefined;
  }
  return viewer;
}

export async function requireAdmin(
  req: Request,
  res: Response,
): Promise<User | undefined> {
  const viewer = await requireViewer(req, res);
  if (!viewer) return undefined;
  if (!viewer.isAdmin && !["admin", "owner"].includes(viewer.adminRole)) {
    res.status(403).json({ error: "Administrator access is required." });
    return undefined;
  }
  return viewer;
}

export function isOwner(viewer: User): boolean {
  return viewer.adminRole === "owner";
}