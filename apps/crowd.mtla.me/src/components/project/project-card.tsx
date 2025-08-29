"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Project } from "@/types/project"

interface ProjectCardProps {
  project: Project
  onSupport: (project: Project) => void
}

export function ProjectCard({ project, onSupport }: ProjectCardProps) {
  const progressPercentage = Math.min(
    (parseFloat(project.current_amount) / parseFloat(project.target_amount)) * 100,
    100
  )
  
  const isCompleted = project.status === "completed"
  
  const statusColor = isCompleted 
    ? "text-secondary" 
    : "text-primary"
  
  const statusText = isCompleted 
    ? "ENDED" 
    : "ACTIVE"

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="px-3 py-1 border-2 border-border bg-muted">
            <span className="text-sm font-mono text-primary">{project.code}</span>
          </div>
          <div className={`px-3 py-1 border-2 border-border bg-background ${statusColor}`}>
            <span className="text-sm font-mono font-bold">{statusText}</span>
          </div>
        </div>
        <CardTitle>{project.name}</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1">
        <p className="text-base text-muted-foreground font-mono leading-relaxed mb-6">
          {project.description.length > 150 
            ? `${project.description.substring(0, 150)}...` 
            : project.description}
        </p>
        
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-bold text-foreground">FUNDING PROGRESS</span>
              <span className="text-lg font-mono text-primary">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-4" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-border bg-muted p-4">
              <div className="text-sm font-mono text-muted-foreground mb-1">RAISED</div>
              <div className="text-xl font-black text-primary">
                {parseInt(project.current_amount).toLocaleString()}
              </div>
            </div>
            <div className="border-2 border-border bg-muted p-4">
              <div className="text-sm font-mono text-muted-foreground mb-1">TARGET</div>
              <div className="text-xl font-black text-foreground">
                {parseInt(project.target_amount).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm font-mono">
            <span className="text-muted-foreground">
              SUPPORTERS: {project.supporters_count}
            </span>
            <span className="text-muted-foreground">
              DEADLINE: {new Date(project.deadline).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => onSupport(project)}
          disabled={isCompleted}
        >
          {isCompleted ? "FUNDING ENDED" : "SUPPORT PROJECT"}
        </Button>
      </CardFooter>
    </Card>
  )
}
