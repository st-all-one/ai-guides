interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div class="card bg-base-100 border border-base-200 hover:border-brand-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
      <div class="card-body p-6 sm:p-8">
        <div class="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">
          {icon}
        </div>
        <h3 class="card-title text-lg font-semibold mb-2">{title}</h3>
        <p class="text-base-content/60 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
