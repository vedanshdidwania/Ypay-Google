import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Shield, 
  Book, 
  Users, 
  Mail, 
  Briefcase, 
  FileText, 
  Lock, 
  Activity,
  ArrowLeft,
  MessageCircle,
  HelpCircle,
  Code
} from 'lucide-react';
import { motion } from 'motion/react';

const infoContent: Record<string, { title: string; icon: any; content: string; description: string }> = {
  'about': {
    title: 'About YPAY',
    icon: Users,
    description: 'The next generation of P2P digital finance.',
    content: `YPAY is a decentralized P2P protocol designed to bridge the gap between traditional fiat and digital assets. Our mission is to provide a secure, efficient, and accessible platform for global financial settlements.

Founded in 2024, we've built a protocol that prioritizes user security and transaction speed. Our platform uses advanced escrow systems and reputation-based matching to ensure every trade is safe and reliable.`
  },
  'careers': {
    title: 'Careers',
    icon: Briefcase,
    description: 'Join the team building the future of finance.',
    content: `We're always looking for talented individuals to join our mission. At YPAY, we value innovation, security, and user-centric design.

Current Openings:
- Senior Blockchain Engineer
- Full-stack Developer (React/Node)
- Security Analyst
- Customer Success Specialist

Send your CV to careers@ypay.protocol`
  },
  'contact': {
    title: 'Contact Us',
    icon: Mail,
    description: "We're here to help you with any questions.",
    content: `Need assistance? Our team is available 24/7 to support you.

Email: support@ypay.protocol
Business Inquiries: biz@ypay.protocol
Media: press@ypay.protocol

You can also use our live chat support available in the dashboard.`
  },
  'blog': {
    title: 'YPAY Blog',
    icon: FileText,
    description: 'Latest news and insights from the YPAY team.',
    content: `Stay updated with the latest developments in the P2P space.

Latest Posts:
- The Future of Fiat-to-Crypto Settlements
- How YPAY Ensures Transaction Security
- Understanding the P2P Escrow System
- New Features: Multi-currency Support`
  },
  'terms': {
    title: 'Terms of Service',
    icon: Book,
    description: 'The rules and guidelines for using our platform.',
    content: `By using YPAY, you agree to comply with our terms of service. Our platform is designed for legal P2P trading of digital assets.

Key Terms:
- Users must be 18+ years old
- KYC verification is required for high-volume trading
- Fraudulent activity results in immediate account termination
- Escrow disputes are resolved by YPAY administrators`
  },
  'privacy': {
    title: 'Privacy Policy',
    icon: Lock,
    description: 'How we protect and manage your data.',
    content: `Your privacy is our priority. We use industry-standard encryption to protect your personal information.

- We only collect necessary data for KYC and security
- Your data is never sold to third parties
- You have full control over your account data
- We use SOC2 compliant infrastructure`
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    icon: Shield,
    description: 'Information about how we use cookies.',
    content: `We use cookies to improve your experience on our platform.

- Essential cookies for security and authentication
- Analytics cookies to understand platform usage
- Preference cookies to remember your settings
- You can manage cookie settings in your browser`
  },
  'security': {
    title: 'Security',
    icon: Shield,
    description: 'Our commitment to platform and user security.',
    content: `YPAY is built with security at its core. We employ multiple layers of protection to safeguard your assets.

- Multi-signature escrow system
- Real-time fraud detection
- Regular security audits
- SOC2 Type II Compliance
- 2FA support for all accounts`
  },
  'support': {
    title: 'Support Center',
    icon: HelpCircle,
    description: 'Find answers to common questions and get help.',
    content: `Welcome to the YPAY Support Center. We're here to ensure your trading experience is smooth.

Common Topics:
- How to complete KYC
- Making your first P2P trade
- Managing your wallet
- Resolving disputes
- Withdrawal processing times`
  },
  'api-docs': {
    title: 'API Documentation',
    icon: Code,
    description: 'Integrate YPAY protocol into your applications.',
    content: `Build on top of the YPAY P2P protocol. Our robust API allows for seamless integration.

- RESTful API endpoints
- WebSocket support for real-time updates
- Comprehensive SDKs for JS/TS, Python, and Go
- Sandbox environment for testing`
  },
  'status': {
    title: 'System Status',
    icon: Activity,
    description: 'Real-time status of YPAY services.',
    content: `All Systems Operational.

- P2P Engine: Operational
- Wallet Services: Operational
- API: Operational
- KYC Processing: Operational
- Support Chat: Operational`
  },
  'community': {
    title: 'Community',
    icon: MessageCircle,
    description: 'Connect with other YPAY traders and developers.',
    content: `Join the growing YPAY community.

- Discord: Join our server for real-time discussion
- Telegram: Official announcements and community chat
- Twitter: Follow us for the latest updates
- GitHub: Contribute to our open-source components`
  }
};

export default function InfoPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? infoContent[slug] : null;

  if (!content) {
    return (
      <div className="min-h-screen bg-[#050505] pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-display font-bold text-white mb-6">Page Not Found</h1>
          <p className="text-gray-400 mb-8 text-lg">The information page you are looking for doesn't exist.</p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-[#050505] pt-32 pb-20 px-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-12 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center border border-brand/20">
              <Icon className="w-8 h-8 text-brand" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{content.title}</h1>
              <p className="text-gray-400 text-lg">{content.description}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-xl">
            <div className="prose prose-invert max-w-none">
              {content.content.split('\n\n').map((paragraph, idx) => (
                <p key={idx} className="text-gray-300 text-lg leading-relaxed mb-6 last:mb-0">
                  {paragraph.split('\n').map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {line}
                      {lIdx < paragraph.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-white font-bold mb-2">Need Help?</h3>
              <p className="text-sm text-gray-400 mb-4">Our support team is available 24/7 to assist you.</p>
              <Link to="/contact" className="text-brand text-sm font-bold hover:underline">Contact Support</Link>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-white font-bold mb-2">Documentation</h3>
              <p className="text-sm text-gray-400 mb-4">Learn more about how our protocol works.</p>
              <Link to="/api-docs" className="text-brand text-sm font-bold hover:underline">View Docs</Link>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-white font-bold mb-2">Community</h3>
              <p className="text-sm text-gray-400 mb-4">Join our Discord to chat with other traders.</p>
              <Link to="/community" className="text-brand text-sm font-bold hover:underline">Join Discord</Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
