type BadgeVariant = "default" | "danger" | "warning" | "success" | "info";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantStyles: Record<BadgeVariant, { backgroundColor: string; color: string }> = {
  default: { backgroundColor: "#F5F5F7", color: "#6E6E73" },
  danger:  { backgroundColor: "#FFF1F0", color: "#FF3B30" },
  warning: { backgroundColor: "#FFF5E6", color: "#FF9500" },
  success: { backgroundColor: "#F0FDF4", color: "#34C759" },
  info:    { backgroundColor: "#EFF6FF", color: "#2563EB" },
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 16,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1px",
        ...variantStyles[variant],
      }}
    >
      {children}
    </span>
  );
}
