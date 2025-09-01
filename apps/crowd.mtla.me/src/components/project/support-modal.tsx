"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/types/project";
import { useState } from "react";

interface SupportModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
}

export function SupportModal({ project, open, onClose }: Readonly<SupportModalProps>) {
  const [amount, setAmount] = useState("100");
  const [isGenerating, setIsGenerating] = useState(false);

  if (project === null) return null;

  const progressPercentage = Math.min(
    (parseFloat(project.current_amount) / parseFloat(project.target_amount)) * 100,
    100,
  );

  const handleGenerateTransaction = async () => {
    setIsGenerating(true);
    // TODO: Implement transaction generation
    setTimeout(() => {
      setIsGenerating(false);
      // For now, do nothing after generation
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{project.name}</DialogTitle>
          <DialogDescription>
            PROJECT CODE: {project.code} | DEADLINE: {new Date(project.deadline).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="border-2 border-border bg-card p-6">
              <h3 className="text-xl font-bold text-primary uppercase mb-4">
                PROJECT DETAILS
              </h3>
              <div className="space-y-4 text-base font-mono">
                <div>
                  <span className="text-muted-foreground">DESCRIPTION:</span>
                  <p className="text-foreground mt-2 leading-relaxed">
                    {project.description}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">CONTACT ACCOUNT:</span>
                  <p className="text-foreground mt-1 break-all text-sm">
                    {project.contact_account_id}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">PROJECT ACCOUNT:</span>
                  <p className="text-foreground mt-1 break-all text-sm">
                    {project.project_account_id}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-2 border-border bg-card p-6">
              <h3 className="text-xl font-bold text-primary uppercase mb-4">
                FUNDING STATUS
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-bold text-foreground">PROGRESS</span>
                    <span className="text-lg font-mono text-primary">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-6" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="border-2 border-border bg-muted p-4 text-center">
                    <div className="text-sm font-mono text-muted-foreground mb-1">RAISED</div>
                    <div className="text-2xl font-black text-primary">
                      {parseInt(project.current_amount).toLocaleString()}
                    </div>
                  </div>
                  <div className="border-2 border-border bg-muted p-4 text-center">
                    <div className="text-sm font-mono text-muted-foreground mb-1">TARGET</div>
                    <div className="text-2xl font-black text-foreground">
                      {parseInt(project.target_amount).toLocaleString()}
                    </div>
                  </div>
                  <div className="border-2 border-border bg-muted p-4 text-center">
                    <div className="text-sm font-mono text-muted-foreground mb-1">SUPPORTERS</div>
                    <div className="text-2xl font-black text-secondary">
                      {project.supporters_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-primary bg-background p-6">
              <h3 className="text-xl font-bold text-primary uppercase mb-6">
                SUPPORT PROJECT
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-foreground mb-3 uppercase">
                    Amount (MTLCrowd Tokens)
                  </label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    className="text-xl text-center"
                    placeholder="100"
                  />
                  <p className="text-sm font-mono text-muted-foreground mt-2">
                    MINIMUM SUPPORT: 1 MTLCROWD TOKEN
                  </p>
                </div>

                <div className="border-2 border-secondary bg-card p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-4 h-4 bg-secondary" />
                    <span className="text-lg font-bold text-secondary uppercase">
                      TRANSACTION PREVIEW
                    </span>
                  </div>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AMOUNT:</span>
                      <span className="text-foreground">{amount} MTLCROWD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RECIPIENT:</span>
                      <span className="text-foreground">{project.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NETWORK FEE:</span>
                      <span className="text-foreground">~0.00001 XLM</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleGenerateTransaction}
                  disabled={isGenerating || amount === "" || parseFloat(amount) < 1}
                  className="w-full text-xl py-6"
                  size="lg"
                >
                  {isGenerating ? "GENERATING..." : "GENERATE TRANSACTION"}
                </Button>

                {isGenerating && (
                  <div className="border-2 border-accent bg-background p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-4 h-4 bg-accent animate-pulse" />
                      <span className="text-lg font-bold text-accent uppercase">
                        PROCESSING TRANSACTION
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-accent animate-pulse" />
                        <span className="text-sm font-mono text-muted-foreground">
                          VALIDATING PARAMETERS...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-accent animate-pulse delay-100" />
                        <span className="text-sm font-mono text-muted-foreground">
                          BUILDING STELLAR TRANSACTION...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-accent animate-pulse delay-200" />
                        <span className="text-sm font-mono text-muted-foreground">
                          PREPARING FOR SIGNATURE...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            CLOSE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
