type StatusDotVariant = "danger" | "warning" | "success" | "info";

type StatusDotProps = {
  variant: StatusDotVariant;
  className?: string;
};

const variantClasses: Record<StatusDotVariant, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  success: "bg-success",
  info: "bg-accent",
};

export default function StatusDot({ variant, className = "" }: StatusDotProps) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${variantClasses[variant]} ${className}`}
    />
  );
}
