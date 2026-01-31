import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
    type ComponentProps,
    createContext,
    useContext,
    useState,
} from "react";

import { cn } from "@/lib/utils/cn";

// Context to share toggle function for mobile click support
const TooltipToggleContext = createContext<(() => void) | null>(null);

function TooltipProvider({
    delayDuration = 0,
    ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
    return (
        <TooltipPrimitive.Provider
            data-slot="tooltip-provider"
            delayDuration={delayDuration}
            {...props}
        />
    );
}

function Tooltip({
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    children,
    ...props
}: ComponentProps<typeof TooltipPrimitive.Root>) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const onOpenChange = isControlled
        ? controlledOnOpenChange
        : setUncontrolledOpen;

    const toggle = () => onOpenChange?.(!open);

    return (
        <TooltipProvider>
            <TooltipPrimitive.Root
                data-slot="tooltip"
                open={open}
                onOpenChange={onOpenChange}
                {...props}
            >
                <TooltipToggleContext.Provider value={toggle}>
                    {children}
                </TooltipToggleContext.Provider>
            </TooltipPrimitive.Root>
        </TooltipProvider>
    );
}

function TooltipTrigger({
    onClick,
    ...props
}: ComponentProps<typeof TooltipPrimitive.Trigger>) {
    const toggle = useContext(TooltipToggleContext);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // Toggle on click for mobile support
        toggle?.();
        onClick?.(e);
    };

    return (
        <TooltipPrimitive.Trigger
            data-slot="tooltip-trigger"
            onClick={handleClick}
            {...props}
        />
    );
}

function TooltipContent({
    className,
    sideOffset = 0,
    children,
    ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
                data-slot="tooltip-content"
                sideOffset={sideOffset}
                className={cn(
                    "bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
                    className,
                )}
                {...props}
            >
                {children}
                <TooltipPrimitive.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
            </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
    );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
