export default function FixedBg() {
  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat pointer-events-none"
      style={{ backgroundImage: "url('/bg.png')" }}
    />
  )
}
