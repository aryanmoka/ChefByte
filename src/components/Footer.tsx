import React from 'react';
import { Linkedin, Github } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-white py-10 transition-colors duration-300 w-full overflow-hidden">

      <div className="max-w-6xl mx-auto px-4">

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

          {/* LEFT — Brand */}
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
            <h3 className="text-2xl font-bold mb-2 text-amber-400 tracking-wide">Chef Byte</h3>
            <p className="text-gray-300 text-sm max-w-xs leading-relaxed">
              Your personal AI cooking assistant — recipes, tips, ingredient hacks and more.
            </p>
          </div>

          {/* RIGHT — Social icons */}
          <div className="text-center md:text-right flex flex-col items-center md:items-end">
            <h4 className="font-semibold text-lg mb-3 text-gray-200">Connect With Us</h4>

            <div className="flex space-x-5 mt-1">
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/aryanmokashi49"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors shadow-md"
              >
                <Linkedin size={22} className="text-blue-400" />
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/aryanmoka"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors shadow-md"
              >
                <Github size={22} className="text-gray-300" />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-6 text-center text-gray-500 text-sm">
          © {currentYear} <span className="text-amber-400 font-medium">Chef Byte</span> · All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;