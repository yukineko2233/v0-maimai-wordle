// components/fixed-bg.tsx
export default function FixedBg() {
    return (
        <div
            className="
        fixed inset-0 -z-10
        bg-[url('/bg.png')] bg-cover bg-center bg-no-repeat
        pointer-events-none   /* keeps it untouchable */
      "
        />
    );
}
