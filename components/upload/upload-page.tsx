"use client";

import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { AnimatePresence, motion } from "framer-motion";
import { Link2Icon, ZapIcon } from "lucide-react";
import { addToast } from "@heroui/toast";
import { Input } from "@heroui/input";
import { DotIcon, LinkIcon, Loader2Icon } from "lucide-react";
import { RiErrorWarningFill } from "react-icons/ri";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { IoMdOptions } from "react-icons/io";
import { IoIosLink, IoIosAddCircle } from "react-icons/io";
import { BsFillTrash3Fill } from "react-icons/bs";
import { useState } from "react";

import FileIcon from "../file-icon";

import { copyTextToClipboard, formatBytes } from "@/utils/helpers";
import { useUploader } from "@/utils/uploader";

const STATUS = {
  UPLOADED: "uploaded",
  UPLOADING: "uploading",
  ERROR: "error",
};

export function UploadPage() {
  const {
    files,
    folderUrl,
    disabledKeys,
    onFileChange,
    createFolder,
    deleteFolder,
    onButtonClick,
    inputRef,
  } = useUploader("/");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");

  const uploadedFilesCount = files.filter(
    (file) => file.status === STATUS.UPLOADED,
  ).length;
  const totalFilesCount = files.length;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
        <AnimatePresence mode="wait">
          {files.length === 0 ? (
            <motion.div
              key="section1"
              animate={{ opacity: 1 }}
              className="h-full"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <div className="relative flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-y-5">
                  <ZapIcon className="w-20 h-20 stroke-default-600 stroke-4" />
                  <h2 className="max-w-xs font-semibold text-3xl tracking-tight text-center">
                    Your reliable file sharing solution.
                  </h2>

                  <div className="flex justify-center gap-x-4">
                    <div className="relative">
                      <Button
                        className="cursor-pointer rounded-xl w-80 text-sm"
                        color="default"
                        size="lg"
                        type="submit"
                        variant="flat"
                        onPress={onButtonClick}
                      >
                        Upload a file
                      </Button>
                      <input
                        ref={inputRef}
                        multiple
                        className="hidden"
                        type="file"
                        onChange={onFileChange}
                      />
                    </div>
                  </div>
                  <p className="text-sm">
                    <span className="text-zinc-400">Stay connected</span>
                    {" - "}
                    <Link
                      className="text-sm"
                      color="foreground"
                      href="/discord"
                      underline="hover"
                    >
                      Join our Discord!
                    </Link>
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="section2"
              animate={{ opacity: 1, y: 0 }}
              className="h-full w-full flex justify-center items-center flex-col gap-y-2 relative"
              exit={{ opacity: 0, y: -20 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="max-w-[475px] w-full">
                <div>
                  <div className="flex justify-between gap-x-2 max-md:flex-col max-md:gap-y-4 mt-5 px-2">
                    <div>
                      <h3>Selected files</h3>
                      <p className="text-sm">
                        <span className="text-zinc-400">Got a second?</span>{" "}
                        <a
                          className="text-sm text-foreground hover:underline"
                          href="/discord"
                          target="_blank"
                        >
                          Join the Discord
                        </a>
                      </p>
                    </div>
                    <div className="flex items-center max-md:justify-between gap-x-2">
                      <div className="w-full">
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={onButtonClick}
                        >
                          Add more files
                        </Button>
                        <input
                          ref={inputRef}
                          multiple
                          className="hidden"
                          type="file"
                          onChange={onFileChange}
                        />
                      </div>
                      <Dropdown
                        className="bg-background"
                        placement="bottom-end"
                      >
                        <DropdownTrigger>
                          <Button isIconOnly size="sm" variant="flat">
                            <IoMdOptions className="w-4 h-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label="Static Actions"
                          disabledKeys={disabledKeys}
                        >
                          <DropdownSection showDivider>
                            <DropdownItem
                              key="upload-info"
                              className="text-xs opacity-80 border-none data-[hover=true]:bg-inherit cursor-default"
                              variant="faded"
                            >
                              <div className="flex justify-between w-full">
                                <p>
                                  {uploadedFilesCount} of {totalFilesCount}{" "}
                                  files uploaded.
                                </p>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() => {
                                    if (
                                      files.filter(
                                        (file) =>
                                          file.status === STATUS.UPLOADED,
                                      ).length == files.length
                                    ) {
                                      copyTextToClipboard(
                                        files
                                          .map(
                                            (file) =>
                                              `${window.location.origin}${file.fileUrl}`,
                                          )
                                          .join(" \n"),
                                      );
                                      addToast({
                                        variant: "flat",
                                        color: "default",
                                        description:
                                          "All share URLs copied to clipboard.",
                                      });
                                    }
                                  }}
                                >
                                  <Link2Icon className="w-3 h-3" />
                                </Button>
                              </div>
                            </DropdownItem>
                          </DropdownSection>
                          <DropdownSection title="Folder actions">
                            <DropdownItem
                              key="create-folder"
                              description="Create a new folder to organize your files."
                              startContent={
                                <IoIosAddCircle className="w-5 h-5" />
                              }
                              variant="faded"
                              onPress={() => setIsModalOpen(true)}
                            >
                              Create folder
                            </DropdownItem>
                            <DropdownItem
                              key="copy-folder-url"
                              description="Copy the folder URL to clipboard."
                              startContent={<IoIosLink className="w-5 h-5" />}
                              variant="faded"
                              onPress={() => {
                                if (folderUrl) {
                                  copyTextToClipboard(folderUrl);
                                  addToast({
                                    description:
                                      "Folder URL copied to clipboard.",
                                  });
                                }
                              }}
                            >
                              Copy folder share URL
                            </DropdownItem>
                            <DropdownItem
                              key="delete-folder"
                              className="transition-all text-danger data-[hover=true]:border-danger/50 data-[hover=true]:bg-danger/10"
                              color="danger"
                              description="Remove folder without the files inside."
                              startContent={
                                <BsFillTrash3Fill className="w-5 h-5" />
                              }
                              variant="faded"
                              onPress={() => deleteFolder()}
                            >
                              Delete folder
                            </DropdownItem>
                          </DropdownSection>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute top-0 left-0 right-0 h-5 from-transparent to-background bg-gradient-to-t transition-all duration-300" />

                    <div className="flex flex-col gap-y-2 max-h-72 md:max-h-96 lg:max-h-[510px] overflow-scroll py-5 px-2">
                      {files.map((fileObject, idx) => (
                        <div
                          key={idx}
                          suppressHydrationWarning
                          className="border bg-default-100 rounded-xl flex items-center justify-between gap-x-2"
                        >
                          <div className="flex items-center gap-x-2 w-full overflow-hidden">
                            <div className="p-4 bg-default-200 rounded-lg w-fit m-3 mr-0">
                              <FileIcon fileName={fileObject.file.name} />
                            </div>
                            <div className="flex flex-col gap-y-1.5 px-2 min-w-[200px] md:min-w-[270px]">
                              <div className="flex items-center gap-x-2 w-full">
                                <div className="flex-1 flex items-center min-w-0">
                                  <span className="text-sm font-semibold truncate">
                                    {fileObject.file.name}
                                  </span>
                                  <DotIcon className="w-4 h-4 shrink-0 text-zinc-400" />
                                  <p className="text-zinc-400 text-sm whitespace-pre-line shrink-0">
                                    {formatBytes(fileObject.file.size)}
                                  </p>
                                </div>
                              </div>
                              <div className="h-1 bg-default-200 rounded-lg w-full">
                                <div
                                  className="h-full bg-default-500 rounded-lg"
                                  style={{
                                    width: `${fileObject.uploadProgress}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            className={`w-20 border-l-2 border-l-default-200 p-7 transition-all h-full rounded-r-xl ${
                              fileObject.status === STATUS.UPLOADED
                                ? "hover:bg-default-200 cursor-pointer border-secondary-100"
                                : "pointer-events-none"
                            }`}
                            onClick={() => {
                              if (fileObject.status === STATUS.UPLOADED) {
                                copyTextToClipboard(
                                  window.location.origin + fileObject.fileUrl,
                                );
                                addToast({
                                  variant: "flat",
                                  color: "default",
                                  description: "Share URL copied to clipboard.",
                                });
                              }
                            }}
                          >
                            <AnimatePresence mode="wait">
                              {fileObject.status === STATUS.UPLOADED && (
                                <motion.div
                                  animate={{ x: 0, opacity: 1 }}
                                  exit={{ x: "50%", opacity: 0 }}
                                  initial={{ x: "50%", opacity: 0 }}
                                  transition={{
                                    delay: 0.2,
                                    duration: 0.5,
                                    ease: "easeInOut",
                                  }}
                                >
                                  <LinkIcon className="w-4 h-4" />
                                </motion.div>
                              )}
                              {fileObject.status === STATUS.UPLOADING && (
                                <motion.div
                                  animate={{ x: 0, opacity: 1 }}
                                  exit={{ x: "50%", opacity: 0 }}
                                  initial={{ x: "50%", opacity: 0 }}
                                  transition={{
                                    delay: 0.2,
                                    duration: 0.5,
                                    ease: "easeInOut",
                                  }}
                                >
                                  <Loader2Icon className="w-4 h-4 animate-spin" />
                                </motion.div>
                              )}
                              {fileObject.status === STATUS.ERROR && (
                                <motion.div
                                  animate={{ x: 0, opacity: 1 }}
                                  exit={{ x: "50%", opacity: 0 }}
                                  initial={{ x: "50%", opacity: 0 }}
                                  transition={{
                                    delay: 0.2,
                                    duration: 0.5,
                                    ease: "easeInOut",
                                  }}
                                >
                                  <RiErrorWarningFill className="w-4 h-4" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-5 from-transparent to-background bg-gradient-to-b transition-all duration-300" />
                  </div>

                  <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
                    <ModalContent className="rounded-xl">
                      <ModalHeader>
                        <h3 className="text-sm font-medium text-foreground">
                          Create New Folder
                        </h3>
                      </ModalHeader>
                      <ModalBody>
                        <Input
                          className="rounded-xl"
                          placeholder="Folder name"
                          size="sm"
                          value={folderName}
                          variant="bordered"
                          onChange={(e) => setFolderName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setIsModalOpen(false);
                              createFolder(folderName);
                            }
                          }}
                        />
                      </ModalBody>
                      <ModalFooter>
                        <Button
                          className="rounded-xl"
                          size="sm"
                          variant="bordered"
                          onPress={() => setIsModalOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="rounded-xl"
                          size="sm"
                          variant="bordered"
                          onPress={() => {
                            createFolder(folderName);
                            setIsModalOpen(false);
                          }}
                        >
                          Create
                        </Button>
                      </ModalFooter>
                    </ModalContent>
                  </Modal>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
