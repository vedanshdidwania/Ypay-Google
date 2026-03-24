import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Twitter, 
  Github, 
  Linkedin, 
  Mail, 
  ShieldCheck, 
  Globe, 
  Zap,
  ExternalLink
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { name: 'Marketplace', path: '/p2p' },
      { name: 'Wallet', path: '/wallet' },
      { name: 'Buy USDT', path: '/buy' },
      { name: 'Sell USDT', path: '/sell' },
    ],
    Company: [
      { name: 'About Us', path: '/info/about' },
      { name: 'Careers', path: '/info/careers' },
      { name: 'Contact', path: '/info/contact' },
      { name: 'Blog', path: '/info/blog' },
    ],
    Legal: [
      { name: 'Terms of Service', path: '/info/terms' },
      { name: 'Privacy Policy', path: '/info/privacy' },
      { name: 'Cookie Policy', path: '/info/cookie-policy' },
      { name: 'Security', path: '/info/security' },
    ],
    Resources: [
      { name: 'Support Center', path: '/info/support' },
      { name: 'API Docs', path: '/info/api-docs' },
      { name: 'Status', path: '/info/status' },
      { name: 'Community', path: '/info/community' },
    ]
  };

  const socialLinks = [
    { icon: Twitter, href: '/info/community', label: 'Twitter' },
    { icon: Github, href: '/info/community', label: 'GitHub' },
    { icon: Linkedin, href: '/info/community', label: 'LinkedIn' },
    { icon: Mail, href: 'mailto:support@ypay.protocol', label: 'Email' },
  ];

  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-12 mb-16">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shadow-lg shadow-brand/10 group-hover:scale-105 transition-transform overflow-hidden border border-white/10">
                <img 
                src="https://res.cloudinary.com/dvep5xtf2/image/upload/v1774265829/logo.png_l0lsdc.png" 
                  alt="Y" 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Y&background=4F46E5&color=fff&bold=true';
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-display font-bold text-white tracking-tight leading-none">YPAY</span>
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest mt-0.5">P2P Protocol</span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 max-w-xs">
              The most secure and efficient P2P protocol for lightning-fast fiat-to-crypto settlements. Built for the next generation of digital finance.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => {
                const isInternal = social.href.startsWith('/');
                const Icon = social.icon;
                
                if (isInternal) {
                  return (
                    <Link
                      key={social.label}
                      to={social.href}
                      className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                      aria-label={social.label}
                    >
                      <Icon className="w-5 h-5" />
                    </Link>
                  );
                }

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6">{category}</h3>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      to={link.path} 
                      className="text-gray-400 hover:text-brand text-sm transition-colors flex items-center gap-1 group"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap justify-center md:justify-start gap-6 text-xs font-medium text-gray-500 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand" />
              SOC2 Compliant
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand" />
              Global Protocol
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" />
              Instant Settlement
            </div>
          </div>
          <div className="text-gray-500 text-xs font-medium uppercase tracking-widest">
            © {currentYear} Ypay Protocol. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
