"use client";

import { Footer as BaseFooter } from "@dreadnought/ui";
import { ExternalLink, Github, MessageCircle } from "lucide-react";

export function Footer() {
  return (
    <BaseFooter
      title="MTLF.STAT"
      description="MONTELIBERO FOUNDATION PORTFOLIO STATISTICS // REAL-TIME STELLAR BLOCKCHAIN DATA"
      sections={[
        {
          title: "РЕСУРСЫ",
          links: [
            { href: "https://github.com/mtlprog/dreadnought", label: "GITHUB", icon: Github },
            { href: "https://montelibero.org/mtl-fund/", label: "ФОНД MONTELIBERO", icon: ExternalLink },
          ],
        },
        {
          title: "СООБЩЕСТВО",
          links: [
            { href: "https://t.me/Montelibero_ru", label: "MONTELIBERO", icon: MessageCircle },
            { href: "https://t.me/montelibero_agora/43852", label: "ГИЛЬДИЯ ПРОГРАММИСТОВ", icon: MessageCircle },
          ],
        },
      ]}
      bottomText="STELLAR BLOCKCHAIN // OPEN SOURCE // REAL-TIME DATA"
      className="border-t-cyber-green"
    />
  );
}
