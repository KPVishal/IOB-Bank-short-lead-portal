export default function PlaceholderPage({ title, subtitle }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-bp-purple">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
      <div className="p-10 bg-white rounded-lg border border-dashed text-center text-gray-500">
        <div className="text-base font-medium mb-1">Coming up next</div>
        <div className="text-sm">Backend &amp; API for this module will be built in an upcoming step.</div>
      </div>
    </div>
  );
}
