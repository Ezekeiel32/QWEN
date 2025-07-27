import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "neon-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-mono font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2 border-transparent bg-black/90 hover:bg-black/80 hover:shadow-[0_0_16px_var(--neon-cyan)]",
  {
    variants: {
      variant: {
        default: "text-neon-cyan border-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-yellow",
        magenta: "text-[var(--neon-magenta)] border-[var(--neon-magenta)] shadow-[var(--shadow-magenta)] hover:bg-[var(--neon-magenta)]/10 hover:text-[var(--neon-yellow)]",
        blue: "text-[var(--neon-blue)] border-[var(--neon-blue)] shadow-[var(--shadow-blue)] hover:bg-[var(--neon-blue)]/10 hover:text-[var(--neon-yellow)]",
        green: "text-[var(--neon-green)] border-[var(--neon-green)] shadow-[0_0_16px_var(--neon-green)] hover:bg-[var(--neon-green)]/10 hover:text-[var(--neon-yellow)]",
        outline: "border-neon-cyan text-neon-cyan bg-transparent hover:bg-neon-cyan/10 hover:text-neon-yellow",
        ghost: "border-none bg-transparent text-neon-cyan hover:bg-neon-cyan/10 hover:text-neon-yellow",
        link: "border-none bg-transparent text-[var(--neon-magenta)] underline underline-offset-4 hover:text-[var(--neon-yellow)]",
      },
      size: {
        default: "h-10 px-4 py-2 min-w-[120px]",
        sm: "h-9 rounded-md px-3 min-w-[90px]",
        lg: "h-11 rounded-md px-8 min-w-[160px]",
        icon: "h-10 w-10 min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
