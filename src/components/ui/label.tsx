/* label — origin-ui pegado del prompt de Gus (flujo Suscripción), verbatim
   salvo el "use client" (no es Next). Es la variante <label> plano — hace lo
   mismo que la de Radix sin sumar dependencia. */

import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium leading-4 text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = "Label";

export { Label };
