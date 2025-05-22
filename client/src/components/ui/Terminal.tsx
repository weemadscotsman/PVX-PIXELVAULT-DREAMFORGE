import * as React from "react";
import { cn } from "@/lib/utils";

const Terminal = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md border border-gray-800 bg-black text-white shadow",
      className
    )}
    {...props}
  />
));
Terminal.displayName = "Terminal";

const TerminalHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center border-b border-gray-800 px-4 py-2", className)}
    {...props}
  />
));
TerminalHeader.displayName = "TerminalHeader";

const TerminalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-auto p-4 font-mono", className)}
    {...props}
  />
));
TerminalBody.displayName = "TerminalBody";

const TerminalOutput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mb-1", className)}
    {...props}
  />
));
TerminalOutput.displayName = "TerminalOutput";

const TerminalInput = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center", className)}
    {...props}
  />
));
TerminalInput.displayName = "TerminalInput";

export { Terminal, TerminalHeader, TerminalBody, TerminalOutput, TerminalInput };