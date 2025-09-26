"use client";

import { ExternalLink, Github, MessageCircle } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t-4 border-cyber-green bg-black mt-24">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-mono text-cyber-green uppercase mb-6 tracking-wider">
              MTLF.STAT
            </h3>
            <p className="text-base font-mono text-steel-gray leading-relaxed">
              MONTELIBERO FOUNDATION PORTFOLIO STATISTICS // REAL-TIME STELLAR BLOCKCHAIN DATA
            </p>
          </div>

          <div>
            <h4 className="text-xl font-mono text-white uppercase mb-6 tracking-wider">
              РЕСУРСЫ
            </h4>
            <div className="space-y-4">
              <Link
                href="https://github.com/mtlprog/dreadnought"
                target="_blank"
                className="flex items-center gap-3 text-lg font-mono text-steel-gray hover:text-cyber-green transition-colors"
              >
                <Github className="w-6 h-6" />
                GITHUB
              </Link>
              <Link
                href="https://montelibero.org/mtl-fund/"
                target="_blank"
                className="flex items-center gap-3 text-lg font-mono text-steel-gray hover:text-cyber-green transition-colors"
              >
                <ExternalLink className="w-6 h-6" />
                ФОНД MONTELIBERO
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-mono text-white uppercase mb-6 tracking-wider">
              СООБЩЕСТВО
            </h4>
            <div className="space-y-4">
              <Link
                href="https://t.me/Montelibero_ru"
                className="flex items-center gap-3 text-lg font-mono text-steel-gray hover:text-cyber-green transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-6 h-6" />
                MONTELIBERO
              </Link>
              <Link
                href="https://t.me/montelibero_agora/43852"
                className="flex items-center gap-3 text-lg font-mono text-steel-gray hover:text-cyber-green transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-6 h-6" />
                ГИЛЬДИЯ ПРОГРАММИСТОВ
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-steel-gray pt-8 mt-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-base font-mono text-steel-gray uppercase tracking-wider">
              STELLAR BLOCKCHAIN // OPEN SOURCE // REAL-TIME DATA
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
