import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<
  React.ElementRef<"input">,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
        "neon-border glass focus:border-[var(--neon-cyan)] focus:shadow-[0_0_16px_var(--neon-cyan)]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
})
Input.displayName = "Input"

export { Input }
