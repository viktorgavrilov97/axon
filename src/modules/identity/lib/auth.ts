import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/shared/lib/db";
import { verifyPassword } from "./password";
import { loginSchema } from "@/shared/lib/validations";
import { generateReferralCode } from "@/shared/lib/referral-code";
import { cookies } from "next/headers";

// Make PrismaAdapter's OAuth linking idempotent.
// Auth.js can call linkAccount even when the OAuth account row already exists;
// PrismaAdapter then tries to create() and hits a unique constraint, which surfaces as OAuthAccountNotLinked.
// With a shared DB across environments (localhost/dev/prod), this becomes very common.
function createIdempotentPrismaAdapter() {
  const baseAdapter = PrismaAdapter(db) as any;

  return {
    ...baseAdapter,
    async linkAccount(account: any) {
      const provider = account?.provider as string;
      const providerAccountId = account?.providerAccountId as string;
      const userId = account?.userId as string;

      if (!provider || !providerAccountId) {
        return baseAdapter.linkAccount(account);
      }

      // If account already exists, make linking idempotent.
      const existing = await db.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
      });

      if (existing) {
        // If it's linked to a different user, keep default behavior (security).
        if (userId && existing.userId !== userId) {
          return baseAdapter.linkAccount(account);
        }

        // Same user: update tokens/metadata and return existing.
        await db.account.update({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId,
            },
          },
          data: {
            access_token: account.access_token ?? undefined,
            refresh_token: account.refresh_token ?? undefined,
            expires_at: account.expires_at ?? undefined,
            token_type: account.token_type ?? undefined,
            scope: account.scope ?? undefined,
            id_token: account.id_token ?? undefined,
            session_state:
              typeof account.session_state === "string" ? account.session_state : undefined,
          },
        });

        return existing;
      }

      return baseAdapter.linkAccount(account);
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createIdempotentPrismaAdapter(),
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true, // Required for production deployments (Vercel, etc.)
  // Use dynamic URL based on request host instead of AUTH_URL env variable
  // This allows dev.axon-capital.space and axon-capital.space to work independently
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  cookies: {
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
      },
    },
    sessionToken: {
      name: `next-auth.session_token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `next-auth.callback_url`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf_token`,
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      /**
       * We use a single shared DB across multiple environments (localhost/dev/prod).
       * Without email-based account linking, users can hit OAuthAccountNotLinked when
       * they first sign up with credentials in one env and then try Google OAuth in another.
       *
       * Google provides verified email, so linking by email is acceptable here.
       */
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      id: "credentials",
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Special marker for 2FA verified login
        if (credentials.password === "2fa_verified") {
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.emailVerified) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }

        // Special marker for auto-login after email verification
        if (credentials.password === "auto_login_after_verification") {
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.emailVerified) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }

        // Special marker for Telegram login
        if (credentials.password === "telegram_login") {
          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            throw new Error("Invalid credentials");
          }

          // Note: We don't require emailVerified for Telegram login
          // Telegram already verified the user through their Login Widget

          // Verify user has Telegram linked
          if (!user.telegramUserId) {
            throw new Error("Telegram account not linked");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }

        const validatedFields = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });

        if (!validatedFields.success) {
          throw new Error("Invalid credentials");
        }

        const { email, password } = validatedFields.data;

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        if (!user.emailVerified) {
          throw new Error("Email not verified. Please verify your email first.");
        }

        const isPasswordValid = await verifyPassword(password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        if (user.isTwoFactorEnabled) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    async signIn({ user, account, isNewUser }) {
      // Handle Google OAuth sign in for existing users
      if (account?.provider === "google" && user.email && account.providerAccountId && !isNewUser) {
        // Check if account is already linked to this user
        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          include: {
            user: {
              select: { id: true },
            },
          },
        });

        // If account exists and is linked to the same user, update tokens if needed
        if (existingAccount && existingAccount.user.id === user.id) {
          console.log(
            `[Auth] [Events] Google account ${account.providerAccountId} is already linked to user ${user.id}, updating tokens if needed`
          );
          // PrismaAdapter should handle token updates automatically, but we log it
        }
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user is signing in with Google
      if (account?.provider === "google" && user.email && account.providerAccountId) {
        // Only allow auto-linking when Google says the email is verified
        // (Google usually provides verified emails, but keep a guardrail)
        const emailVerified =
          typeof (profile as any)?.email_verified === "boolean"
            ? (profile as any).email_verified
            : true;

        if (!emailVerified) {
          console.log("[Auth] Google email is not verified; rejecting sign-in");
          return false;
        }

        // Check if this Google account is already linked to a user
        const existingAccount = await db.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: account.providerAccountId,
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        });

        // If Google account is already linked, check if it's to the same user trying to sign in
        if (existingAccount) {
          // Check if the user trying to sign in exists and matches the linked user
          const signingInUser = await db.user.findUnique({
            where: { email: user.email },
            select: { id: true, email: true },
          });

          console.log(
            `[Auth] Google account check:`,
            `existingAccount.user.id=${existingAccount.user.id},`,
            `existingAccount.user.email=${existingAccount.user.email},`,
            `signingInUser?.id=${signingInUser?.id},`,
            `signingInUser?.email=${signingInUser?.email},`,
            `user.email=${user.email}`
          );

          // If Google account is already linked to the same user, allow sign in
          if (signingInUser && existingAccount.user.id === signingInUser.id) {
            console.log(
              `[Auth] Google account ${account.providerAccountId} is already linked to the same user ${signingInUser.id}, allowing sign in`
            );
            // Update the Account record with fresh tokens
            // PrismaAdapter will handle the account linking, but we update tokens here
            // to ensure they're fresh without triggering PrismaAdapter's OAuthAccountNotLinked check
                try {
                  await db.account.update({
                    where: {
                      provider_providerAccountId: {
                        provider: "google",
                        providerAccountId: account.providerAccountId,
                      },
                    },
                    data: {
                      access_token: account.access_token || undefined,
                      refresh_token: account.refresh_token || undefined,
                      expires_at: account.expires_at || undefined,
                      token_type: account.token_type || undefined,
                      scope: account.scope || undefined,
                      id_token: account.id_token || undefined,
                      session_state: typeof account.session_state === 'string' ? account.session_state : undefined,
                    },
                  });
                  console.log(`[Auth] Updated Account record for user ${signingInUser.id}`);
                } catch (updateError) {
                  console.error(`[Auth] Failed to update Account record:`, updateError);
              // Continue anyway - PrismaAdapter will handle it
            }
            return true; // Allow sign in - account is already correctly linked
          }

          // If Google account is linked to a different user (different ID)
          if (signingInUser && existingAccount.user.id !== signingInUser.id) {
            // In development, allow re-linking if emails match (for testing)
            if (process.env.NODE_ENV === "development" && existingAccount.user.email === user.email) {
              console.log(
                `[Auth] [DEV] Allowing Google account re-link: ${account.providerAccountId} from user ${existingAccount.user.id} to user ${signingInUser.id} (same email)`
              );
              // Delete old account link to allow re-linking
              await db.account.delete({
                where: {
                  provider_providerAccountId: {
                    provider: "google",
                    providerAccountId: account.providerAccountId,
                  },
                },
              });
              // Allow sign in to proceed - PrismaAdapter will create new link
            } else {
              // Reject sign in - NextAuth will redirect to error page
              console.log(
                `[Auth] Google account ${account.providerAccountId} is already linked to user ${existingAccount.user.id} (${existingAccount.user.email}), but trying to link to user ${signingInUser.id} (${user.email})`
              );
              return false;
            }
          }

          // If Google account is linked but user doesn't exist yet (shouldn't happen, but handle it)
          if (!signingInUser && existingAccount.user.email !== user.email) {
            // In development, allow re-linking
            if (process.env.NODE_ENV === "development") {
              console.log(
                `[Auth] [DEV] Allowing Google account re-link: ${account.providerAccountId} from user ${existingAccount.user.id} (${existingAccount.user.email}) to new user with ${user.email}`
              );
              // Delete old account link to allow re-linking
              await db.account.delete({
                where: {
                  provider_providerAccountId: {
                    provider: "google",
                    providerAccountId: account.providerAccountId,
                  },
                },
              });
              // Allow sign in to proceed - PrismaAdapter will create new link
            } else {
              console.log(
                `[Auth] Google account ${account.providerAccountId} is already linked to user ${existingAccount.user.id} (${existingAccount.user.email}), but trying to create new user with ${user.email}`
              );
              return false;
            }
          }
        }

        // Check if user already exists with password but without Google account
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
          include: {
            accounts: {
              where: { provider: "google" },
            },
          },
        });

        // If user exists with password but doesn't have Google account linked,
        // allow sign-in and let PrismaAdapter link by email (allowDangerousEmailAccountLinking).
        // This prevents OAuthAccountNotLinked across shared DB environments.
        
        // If user exists but has Google account linked, allow sign in
        // PrismaAdapter will handle linking the account if needed
        
        // Handle referral code for new Google OAuth registrations
        // PrismaAdapter creates the user, so we need to update it after creation
        // We'll do this in the jwt callback after user is created
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        
        // Handle referral code for new Google OAuth registrations
        if (account?.provider === "google" && user.email) {
          try {
            const cookieStore = await cookies();
            const referralCode = cookieStore.get("pending_referral_code")?.value;
            
            if (referralCode) {
              console.log("[GoogleOAuth] Processing referral code:", referralCode);
              
              // Find referral parent
              const parentUser = await db.user.findUnique({
                where: { referralCode },
                select: { id: true },
              });
              
              if (parentUser) {
                // Get the user that was just created by PrismaAdapter
                const newUser = await db.user.findUnique({
                  where: { email: user.email },
                  select: { id: true, referralParentId: true, referralCode: true },
                });
                
                // Prevent self-referral: check if the referral code belongs to the same user
                if (newUser && parentUser.id === newUser.id) {
                  console.log("[GoogleOAuth] User tried to use their own referral code, ignoring");
                  cookieStore.delete("pending_referral_code");
                  return token;
                }
                
                if (newUser && !newUser.referralParentId) {
                  // Generate referral code if user doesn't have one
                  let userReferralCode: string | null = newUser.referralCode;
                  if (!userReferralCode) {
                    let attempts = 0;
                    const maxAttempts = 10;
                    do {
                      userReferralCode = generateReferralCode();
                      attempts++;
                      const existing = await db.user.findUnique({
                        where: { referralCode: userReferralCode },
                        select: { id: true },
                      });
                      if (!existing) break;
                      if (attempts >= maxAttempts) {
                        console.error("[GoogleOAuth] Failed to generate unique referral code");
                        userReferralCode = null;
                        break;
                      }
                    } while (true);
                  }
                  
                  // Update user with referral parent and code (if generated)
                  const updateData: { referralParentId: string; referralCode?: string } = {
                    referralParentId: parentUser.id,
                  };
                  if (userReferralCode) {
                    updateData.referralCode = userReferralCode;
                  }
                  
                  await db.user.update({
                    where: { id: newUser.id },
                    data: updateData,
                  });
                  
                  console.log("[GoogleOAuth] Set referralParentId:", parentUser.id, "for user:", newUser.id);
                  
                  // Clear the cookie
                  cookieStore.delete("pending_referral_code");
                } else if (newUser && newUser.referralParentId) {
                  console.log("[GoogleOAuth] User already has referralParentId, skipping");
                  // Clear the cookie anyway
                  cookieStore.delete("pending_referral_code");
                }
              } else {
                console.log("[GoogleOAuth] Parent user not found for referral code:", referralCode);
                // Clear invalid referral code cookie
                cookieStore.delete("pending_referral_code");
              }
            }
          } catch (error) {
            console.error("[GoogleOAuth] Error processing referral code:", error);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});

