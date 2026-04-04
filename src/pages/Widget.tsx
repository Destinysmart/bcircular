import { useParams } from 'react-router-dom';
import { Bitcoin } from 'lucide-react';
import { mockCommunities, getScoreColor } from '@/lib/mock-data';

const Widget = () => {
  const { slug } = useParams();
  const community = mockCommunities.find(c => c.slug === slug) || mockCommunities[0];

  return (
    <div className="w-[280px] h-[120px] bg-background border border-border rounded-lg p-4 flex flex-col justify-between font-sans">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground truncate">{community.name}</span>
        <span className={`font-mono text-2xl font-medium ${getScoreColor(community.score)}`}>
          {community.score}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {community.merchants} merchants · {community.earners} earners
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Bitcoin className="h-3 w-3 text-primary" />
        <a href={`https://circular.btc/c/${community.slug}`} target="_blank" rel="noopener" className="hover:text-primary">
          Powered by Circular
        </a>
      </div>
    </div>
  );
};

export default Widget;
