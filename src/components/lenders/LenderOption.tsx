import { LenderLogo } from "./LenderLogo";

interface LenderOptionProps {
    lenderId: string;
    name: string;
    size?: number;
    isCustom?: boolean;
}

export function LenderOption({
    lenderId,
    name,
    size = 20,
    isCustom = false,
}: LenderOptionProps) {
    return (
        <div className="flex items-center gap-2">
            <LenderLogo lenderId={lenderId} size={size} isCustom={isCustom} />
            <span>{name}</span>
        </div>
    );
}
