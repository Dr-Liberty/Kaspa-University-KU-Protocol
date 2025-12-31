import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

const courses = [
  { id: "bitcoin-vs-kaspa", title: "Bitcoin vs Kaspa: The Next Evolution" },
  { id: "dag-terminology", title: "DAG Terminology" },
  { id: "dag-and-kaspa", title: "DAG and Kaspa: Understanding the Structure" },
  { id: "foundational-concepts", title: "Foundational Concepts" },
  { id: "core-data-structures", title: "Core Data Structures" },
  { id: "ghostdag-mechanics", title: "GHOSTDAG Mechanics" },
  { id: "consensus-parameters", title: "Consensus Parameters" },
  { id: "block-processing", title: "Block Processing" },
  { id: "difficulty-adjustment", title: "Difficulty Adjustment (DAA)" },
  { id: "transaction-processing", title: "Transaction Processing" },
  { id: "pruning-system", title: "Pruning System" },
  { id: "anticone-finalization", title: "Anticone Finalization & Safe Pruning" },
  { id: "finality-and-security", title: "Finality and Security" },
  { id: "virtual-state", title: "Virtual State" },
  { id: "timestamps-and-median", title: "Timestamps and Median Time" },
  { id: "network-scaling", title: "Network Scaling" },
];

function CertificateSVG({ courseName, score }: { courseName: string; score: number }) {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const shortAddress = "kaspa:qrewk...v2er";

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" className="w-full h-full">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a0a0a" />
          <stop offset="50%" stopColor="#0f0f0f" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="green" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="hexGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="800" height="600" fill="url(#bg)"/>
      
      <g opacity="0.4">
        <circle cx="60" cy="80" r="4" fill="#10b981" />
        <circle cx="120" cy="50" r="3" fill="#10b981" />
        <circle cx="680" cy="60" r="4" fill="#10b981" />
        <circle cx="740" cy="90" r="3" fill="#10b981" />
        <circle cx="70" cy="480" r="4" fill="#10b981" />
        <circle cx="690" cy="470" r="4" fill="#10b981" />
        <line x1="60" y1="80" x2="120" y2="50" stroke="#10b981" strokeWidth="1" opacity="0.5"/>
        <line x1="680" y1="60" x2="740" y2="90" stroke="#10b981" strokeWidth="1" opacity="0.5"/>
      </g>
      
      <rect x="20" y="20" width="760" height="560" fill="none" stroke="url(#green)" strokeWidth="2" rx="12"/>
      <rect x="28" y="28" width="744" height="544" fill="none" stroke="#1f2937" strokeWidth="1" rx="10"/>
      
      <g transform="translate(400, 70)">
        <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill="#0a0a0a" stroke="url(#hexGreen)" strokeWidth="2"/>
        <polygon points="0,-28 24,-14 24,14 0,28 -24,14 -24,-14" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.5"/>
        <text x="0" y="8" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontSize="22" fill="url(#green)" fontWeight="bold">KU</text>
      </g>
      
      <text x="400" y="135" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fill="#10b981" letterSpacing="4" fontWeight="bold">
        KASPA UNIVERSITY
      </text>
      
      <text x="400" y="180" textAnchor="middle" fontFamily="Georgia, serif" fontSize="36" fill="#ffffff" fontWeight="bold" filter="url(#glow)">
        Certificate of Completion
      </text>
      
      <line x1="150" y1="205" x2="650" y2="205" stroke="url(#green)" strokeWidth="1" opacity="0.5"/>
      
      <text x="400" y="250" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="16" fill="#9ca3af">
        This is to certify that
      </text>
      
      <text x="400" y="290" textAnchor="middle" fontFamily="monospace" fontSize="18" fill="#10b981" fontWeight="bold">
        {shortAddress}
      </text>
      
      <text x="400" y="330" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="16" fill="#9ca3af">
        has successfully completed the course
      </text>
      
      <text x="400" y="380" textAnchor="middle" fontFamily="Georgia, serif" fontSize="28" fill="#ffffff" fontWeight="bold">
        {courseName.length > 35 ? courseName.slice(0, 32) + "..." : courseName}
      </text>
      
      <rect x="340" y="405" width="120" height="40" rx="20" fill="#0a0a0a" stroke="url(#green)" strokeWidth="1"/>
      <text x="400" y="432" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18" fill="#10b981" fontWeight="bold">
        {score}% Score
      </text>
      
      <text x="400" y="485" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fill="#6b7280">
        Awarded on {dateStr}
      </text>
      
      <rect x="100" y="500" width="600" height="50" rx="8" fill="#0d1f17" stroke="#10b981" strokeWidth="1" opacity="0.8"/>
      <circle cx="130" cy="525" r="10" fill="#10b981"/>
      <path d="M126 525l3 3l5-6" stroke="#0a0a0a" strokeWidth="2" fill="none"/>
      <text x="150" y="520" fontFamily="Arial, sans-serif" fontSize="11" fill="#10b981" fontWeight="bold">
        VERIFIED ON-CHAIN
      </text>
      <text x="150" y="535" fontFamily="Arial, sans-serif" fontSize="10" fill="#9ca3af">
        Quiz completion proof embedded via KU Protocol on Kaspa L1
      </text>
      <text x="560" y="527" fontFamily="monospace" fontSize="9" fill="#6b7280">
        Verify: kaspa.university
      </text>
      
      <text x="400" y="570" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" fill="#4b5563">
        KRC-721 NFT Certificate | Kaspa University Collection
      </text>
    </svg>
  );
}

export default function CertificatePreview() {
  return (
    <div className="min-h-screen pt-20">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl" data-testid="text-preview-title">
              Certificate Preview
            </h1>
            <p className="text-muted-foreground">
              Preview of all 16 course certificates before deployment
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course, index) => (
            <Card 
              key={course.id} 
              className="overflow-hidden border-border/50"
              data-testid={`card-preview-${course.id}`}
            >
              <CardContent className="p-0">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-background via-card to-background">
                  <CertificateSVG 
                    courseName={course.title} 
                    score={85 + (index % 16)}
                  />
                </div>
                <div className="border-t border-border/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate" title={course.title}>
                      {course.title}
                    </p>
                    <Badge variant="outline" className="shrink-0">
                      #{index + 1}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
