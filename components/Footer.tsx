import { IoCopyOutline } from "react-icons/io5";

import { socialMedia } from "@/data";
import MagicButton from "./MagicButton";
import Image from "next/image";
import Link from "next/link";

import { useState } from "react";

const Footer = () => {

  const [copied, setCopied] = useState(false);

   
  const handleCopy = () => {
    const text = "stonewerner@berkeley.edu";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000); // Reset after 3 seconds
  };

  return (
    <footer className="w-full pt-20 pb-10" id="contact">
      {/* background grid */}
      <div className="w-full absolute left-0 -bottom-72 min-h-96">
        <img
          src="/footer-grid.svg"
          alt="Stone Werner"
          className="w-full h-full opacity-50 "
        />
      </div>

      <div className="flex flex-col items-center">
        <h1 className="heading lg:max-w-[45vw] text-white">
          Let&apos;s get in <span className="text-purple">touch</span>
        </h1>
        <p className="text-white-200 md:mt-10 my-5 text-center">
          I am always happy to grow my network and connect with fellow enthusiasts in the software and AI space!
        </p>
          <MagicButton
            title={copied ? "Email is Copied!" : "Copy my email address"}
            icon={<IoCopyOutline />}
            position="right"
            handleClick={handleCopy}
          />
      </div>
      <div className="flex mt-16 md:flex-row flex-col justify-between items-center">
        <p className="md:text-base text-sm md:font-normal font-light text-white">
          Copyright © 2024 Stone Werner
        </p>

        <div className="flex items-center md:gap-3 gap-6">
          {socialMedia.map((info) => (
            <div
              key={info.id}
              className="w-10 h-10 cursor-pointer flex justify-center items-center backdrop-filter backdrop-blur-lg saturate-180 bg-opacity-75 bg-black-200 rounded-lg border border-black-300"
            >
              <Link href={info.link} target="_blank">
              <Image src={info.img} alt="Stone Werner" width={20} height={20} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
