"use client";

import { Button } from "@heroui/button";
import { AnimatePresence, motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { FaGoogle, FaGithub } from "react-icons/fa";
export default function SigninPage() {
  const [clickedProvider, setClickedProvider] = useState<string>();

  const handleClick = (provider: string) => {
    setClickedProvider(provider);
    signIn(provider.toLowerCase());
  };

  return (
    <div className="flex items-center justify-center h-[78vh]">
      <div className="px-3 max-md:w-full md:min-w-[475px]">
        <AnimatePresence mode="wait">
          {!clickedProvider && (
            <motion.div
              key="k1"
              animate={{ opacity: 1, y: 0 }}
              className="relative px-3"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <h2 className="mb-0">Sign in to your account!</h2>
              <p className="mb-5">Connect to Solven with:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="rounded-sm border-foreground hover:bg-default-50"
                  startContent={<FaGoogle className="w-4 h-4" />}
                  variant="bordered"
                  onPress={() => handleClick("Google")}
                >
                  Google
                </Button>
                <Button
                  className="rounded-sm border-foreground hover:bg-default-50"
                  startContent={<FaGithub className="w-4 h-4" />}
                  variant="bordered"
                  onPress={() => handleClick("GitHub")}
                >
                  GitHub
                </Button>
              </div>
            </motion.div>
          )}
          {clickedProvider && (
            <motion.div
              key="k2"
              animate={{ opacity: 1, y: 0 }}
              className="relative px-3"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <h2 className="mb-0">Redirecting you to the provider...</h2>
              <p>Please wait while we are redirecting you.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
