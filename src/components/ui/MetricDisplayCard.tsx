import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for className
import { motion } from 'framer-motion'; // For smooth transitions

interface MetricDisplayCardProps {
  title: string;
  value: number | string | null;
  unit?: string;
  icon: LucideIcon;
  percentage?: number | null; // Optional percentage for the progress bar
}

const MetricDisplayCard: React.FC<MetricDisplayCardProps> = ({
  title,
  value,
  unit,
  icon: Icon, // Renamed to Icon to be used as a component
  percentage,
}) => {
  const isPercentage = percentage !== undefined && percentage !== null;

  return (
    <Card className="bg-card text-card-foreground border border-primary/20 overflow-hidden relative group">
       {/* Optional: Add a subtle background element for techy feel */}
       <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10">
        <CardTitle className="text-sm font-medium text-primary group-hover:text-primary-foreground transition-colors duration-300">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-accent group-hover:text-primary-foreground transition-colors duration-300" />
      </CardHeader>
      <CardContent className="z-10">
        {isPercentage ? (
          <>
            <div className="text-2xl font-bold text-foreground">
              {value !== null ? (typeof value === 'number' ? value.toFixed(1) : value) : '--'}{unit}
            </div>
            <p className="text-xs text-muted-foreground">
              {title} usage
            </p>
            {percentage !== null && (
               <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    percentage > 80 ? 'bg-destructive' : percentage > 50 ? 'bg-warning' : 'bg-primary' // Example color logic based on percentage
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
               </div>
            )}
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-foreground">
              {value !== null ? (typeof value === 'number' ? value.toFixed(1) : value) : '--'}{unit}
            </div>
            <p className="text-xs text-muted-foreground">
              Current {title.toLowerCase()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricDisplayCard;