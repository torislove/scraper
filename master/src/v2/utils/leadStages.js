import {
  CircleDollarSign, MessageSquare, Sparkles, Trophy, UserCheck, Users, X
} from 'lucide-react';

export const CRM_STAGES = [
  { id: 'new', label: 'New', hint: 'Fresh lead', tone: 'blue', icon: Sparkles },
  { id: 'pitch_sent', label: 'Pitched', hint: 'Message sent', tone: 'amber', icon: MessageSquare },
  { id: 'in_discussion', label: 'Talking', hint: 'In conversation', tone: 'cyan', icon: Users },
  { id: 'qualified', label: 'Qualified', hint: 'Real opportunity', tone: 'violet', icon: UserCheck },
  { id: 'won', label: 'Won', hint: 'Customer closed', tone: 'lime', icon: Trophy },
  { id: 'lost', label: 'Lost', hint: 'Not now', tone: 'red', icon: X },
  { id: 'archived', label: 'Archived', hint: 'Parked', tone: 'neutral', icon: CircleDollarSign }
];

export function crmStageOf(vendor) {
  const raw = String(vendor?.crmStage || vendor?.crmStatus || 'new').toLowerCase();
  const direct = CRM_STAGES.find(stage => stage.id === raw);
  if (direct) return direct.id;
  const legacy = {
    contacted: 'pitch_sent',
    interested: 'in_discussion',
    proposal: 'qualified',
    closed_won: 'won',
    won: 'won',
    lost: 'lost',
    archived: 'archived'
  };
  return legacy[raw] || 'new';
}

export function formatInr(num) {
  const n = Number(num) || 0;
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
}
