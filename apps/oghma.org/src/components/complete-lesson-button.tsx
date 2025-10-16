"use client";

import { useState } from "react";
import { Button } from "@dreadnought/ui";
import { CheckCircle2, Loader2 } from "lucide-react";
import { completeLesson } from "@/app/actions/lesson-progress";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CompleteLessonButtonProps {
  lessonId: number;
  isAuthenticated: boolean;
  isCompleted: boolean;
}

export function CompleteLessonButton({
  lessonId,
  isAuthenticated,
  isCompleted: initialCompleted,
}: CompleteLessonButtonProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleComplete = () => {
    if (!isAuthenticated) {
      toast.error("Please connect your wallet to track progress");
      return;
    }

    setIsLoading(true);

    void completeLesson(lessonId)
      .then((result) => {
        if (result.success) {
          setIsCompleted(true);
          toast.success("Lesson marked as complete!");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to mark lesson as complete");
        }
      })
      .catch((error) => {
        console.error("Complete lesson error:", error);
        toast.error("An error occurred");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="border-4 border-secondary bg-card p-6 mb-8">
      <div className="flex items-center gap-4">
        <CheckCircle2
          className={`w-8 h-8 ${isCompleted ? "text-green-600" : "text-secondary"}`}
        />
        <div className="flex-1">
          <p className="font-bold uppercase text-lg">
            {isCompleted ? "LESSON COMPLETED" : "MARK AS COMPLETE"}
          </p>
          <p className="text-sm font-mono text-muted-foreground">
            {isAuthenticated
              ? isCompleted
                ? "You have completed this lesson"
                : "Mark this lesson as complete to track your progress"
              : "Connect wallet to track your progress"}
          </p>
        </div>
        {isCompleted ? (
          <div className="px-6 py-3 border-2 border-green-600 bg-green-600/10">
            <span className="text-sm font-bold uppercase text-green-600">
              ✓ COMPLETED
            </span>
          </div>
        ) : (
          <Button
            size="lg"
            onClick={handleComplete}
            disabled={!isAuthenticated || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                SAVING...
              </>
            ) : (
              "COMPLETE LESSON"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
