import {
    BER_GROUP_LIST,
    BER_RATINGS,
    type BerGroup,
    type BerRating,
} from "@/lib/constants/ber";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";

interface BerSelectorBaseProps {
    id?: string;
    label?: string;
    compact?: boolean;
}

interface BerSelectorRatingProps extends BerSelectorBaseProps {
    mode?: "rating";
    value: BerRating;
    onChange: (value: BerRating) => void;
}

interface BerSelectorGroupProps extends BerSelectorBaseProps {
    mode: "group";
    value: BerGroup | "all";
    onChange: (value: BerGroup | "all") => void;
}

type BerSelectorProps = BerSelectorRatingProps | BerSelectorGroupProps;

export function BerSelector(props: BerSelectorProps) {
    const {
        id = "berRating",
        label = "BER Rating",
        compact = false,
        mode = "rating",
    } = props;

    const isGroupMode = mode === "group";
    const options = isGroupMode ? BER_GROUP_LIST : BER_RATINGS;
    const placeholder = isGroupMode
        ? "All BER"
        : compact
          ? "BER"
          : "Select BER";

    // For group mode, include "all" option
    const allOptions = isGroupMode ? ["all", ...options] : options;

    const getDisplayValue = (val: string) => {
        if (val === "all") return "All BER";
        return val;
    };

    const handleChange = (val: string) => {
        if (isGroupMode) {
            (props as BerSelectorGroupProps).onChange(val as BerGroup | "all");
        } else {
            (props as BerSelectorRatingProps).onChange(val as BerRating);
        }
    };

    if (compact) {
        return (
            <Select value={props.value} onValueChange={handleChange}>
                <SelectTrigger id={id} className="h-9 w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {allOptions.map((ber) => (
                        <SelectItem key={ber} value={ber}>
                            {getDisplayValue(ber)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Select value={props.value} onValueChange={handleChange}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {allOptions.map((ber) => (
                        <SelectItem key={ber} value={ber}>
                            {getDisplayValue(ber)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
