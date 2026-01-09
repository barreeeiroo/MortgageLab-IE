import type { SVGProps } from "react";
import type { SimpleIcon as SimpleIconType } from "simple-icons";
import { siGithub } from "simple-icons";

interface SimpleIconProps extends SVGProps<SVGSVGElement> {
	icon: SimpleIconType;
}

export function SimpleIcon({ icon, ...props }: SimpleIconProps) {
	return (
		<svg
			role="img"
			aria-label={icon.title}
			viewBox="0 0 24 24"
			fill="currentColor"
			{...props}
		>
			<path d={icon.path} />
		</svg>
	);
}

export function GithubIcon(props: SVGProps<SVGSVGElement>) {
	return <SimpleIcon icon={siGithub} {...props} />;
}
