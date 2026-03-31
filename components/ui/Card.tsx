type CardProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export default function Card({ children, className = "", style }: CardProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        padding: 20,
        border: "1px solid rgba(0,0,0,0.05)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
