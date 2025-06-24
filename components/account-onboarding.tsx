"use client";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Link } from "@heroui/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useSession } from "next-auth/react";

import { setupUser } from "@/app/actions/users";

const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters long")
  .max(20, "Username must be at most 20 characters long")
  .regex(/^[a-zA-Z0-9]+$/, "Username must be alphanumeric");

const emailSchema = z.string().email("Please enter a valid email address");

export default function AccountOnboarding({
  providerEmail,
}: {
  providerEmail: string;
}) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(providerEmail);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const { data, update } = useSession();

  const dataNext = async () => {
    const usernameResult = usernameSchema.safeParse(username);
    const emailResult = emailSchema.safeParse(email);

    if (!usernameResult.success) {
      setUsernameError(usernameResult.error.issues[0].message + ".");
    } else {
      setUsernameError(null);
    }

    if (!emailResult.success) {
      setEmailError(emailResult.error.issues[0].message + ".");
    } else {
      setEmailError(null);
    }

    if (usernameResult.success && emailResult.success) {
      const response = await setupUser(username, email);

      if (response && response.success) {
        update({
          user: {
            ...data?.user,
            name: username,
            email,
            onboardingDone: true,
          },
        });
        return setStep(2);
      }
      setUsernameError(
        response?.error || "This username is already used by someone else.",
      );
    }
  };

  useEffect(() => {
    if (!username) return;
    const result = usernameSchema.safeParse(username);

    setUsernameError(
      result.success ? null : result.error.issues[0].message + ".",
    );
  }, [username]);

  useEffect(() => {
    if (!email) return;
    const result = emailSchema.safeParse(email);

    setEmailError(result.success ? null : result.error.issues[0].message + ".");
  }, [email]);

  return (
    <div>
      <AnimatePresence mode="wait">
        {step == 1 && (
          <motion.div
            key="step1"
            animate={{ opacity: 1, y: 0 }}
            className="relative px-3"
            exit={{ opacity: 0, y: -20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <h2 className="mb-0">Welcome to Solven!</h2>
            <p className="mb-10">
              Let&apos;s get started — pick a username and provide your email.
            </p>
            <Input
              className="max-md:w-full md:min-w-[475px]"
              errorMessage={usernameError ?? ""}
              isInvalid={!!usernameError}
              label={`Username${usernameFocused && username ? ` - (${username.length}/20)` : ""}`}
              radius="sm"
              type="text"
              value={username}
              onFocusChange={setUsernameFocused}
              onValueChange={setUsername}
            />
            {!usernameError && (
              <p className="text-tiny opacity-0 p-1">PLACEHOLDER</p>
            )}

            <Input
              className="max-md:w-full md:min-w-[475px] mt-1"
              errorMessage={emailError ?? ""}
              isInvalid={!!emailError}
              label="Email"
              radius="sm"
              type="email"
              value={email}
              onValueChange={setEmail}
            />
            {!emailError && (
              <p className="text-tiny opacity-0 p-1">PLACEHOLDER</p>
            )}
            <Button className="rounded-md float-right mt-5" onPress={dataNext}>
              Next
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
        {step == 2 && (
          <motion.div
            key="step2"
            animate={{ opacity: 1, y: 0 }}
            className="relative px-3"
            exit={{ opacity: 0, y: -20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="max-md:w-full md:min-w-[475px]">
              <h2 className="mb-0">You&apos;re good to go!</h2>
              <p className="mb-10 max-w-lg">
                Your setup is complete, and you&apos;re all set to start
                managing your files.
              </p>

              <div className="float-right flex gap-x-2 items-center">
                <Link href="/dashboard/files">
                  <Button
                    className="rounded-md"
                    variant="bordered"
                    onPress={dataNext}
                  >
                    Head to your account
                  </Button>
                </Link>

                <Link href="/">
                  <Button className="rounded-md" color="default">
                    Upload a file
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
