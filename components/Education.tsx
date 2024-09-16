import React from 'react';
import { motion } from "framer-motion";
import { SparklesCore } from "@/components/ui/Sparkles";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { TextGenerateEffect } from "@/components/ui/TextGenerateEffect";

const Education = () => {
  const words = `Graduated from the University of California, Berkeley with a degree in [Your Major]. Equipped with cutting-edge knowledge and skills in [Key Areas of Study].`;

  return (
    <div className="h-[40rem] w-full bg-neutral-950 relative flex flex-col items-center justify-center overflow-hidden rounded-md">
      <div className="w-full absolute inset-0 h-screen">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FDB515"
        />
      </div>
      
      <div className="p-4 max-w-7xl mx-auto relative z-10 w-full pt-20 md:pt-0">
        <h1 className="text-4xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50">
          Education
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <p className="mt-4 font-extrabold text-2xl md:text-5xl text-center text-white">
            University of California, Berkeley
          </p>
        </motion.div>
        <div className="mt-8">
          <TextGenerateEffect words={words} />
        </div>
      </div>
      <BackgroundBeams />
    </div>
  );
};

export default Education;