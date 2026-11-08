import {z} from 'zod';
export const categories=['All projects','Game mods','Plugins & extensions','Automation','Scripts & utilities','Business software'] as const;
export type Status='open'|'awaiting_payment'|'in_progress'|'delivered'|'approved'|'completed'|'disputed'|'refunded';
export type Profile={id:string;name:string;bio:string;skills:string[];completed:number;rating:number|null};
export type Project={id:string;owner_id:string;developer_id:string|null;title:string;description:string;category:string;budget:number;deadline:string;skills:string[];status:Status;resale_eligible:boolean;customer_distribution_consent:boolean;developer_distribution_consent:boolean;accepted_bid_id:string|null;created_at:string};
export type Bid={id:string;project_id:string;developer_id:string;amount:number;days:number;proposal:string;created_at:string};
export type Message={id:string;project_id:string;sender_id:string;body:string;created_at:string};
export type Asset={id:string;project_id:string;uploader_id:string;name:string;path:string;size:number;kind:'attachment'|'deliverable';created_at:string};
export type Payment={project_id:string;amount:number;status:'unpaid'|'funded'|'transferred'|'refunded';checkout_session_id?:string;charge_id?:string;transfer_id?:string};
export type Dispute={id:string;project_id:string;opened_by:string;reason:string;status:'open'|'resolved';resolution:string|null;created_at:string};
export type Snapshot={profiles:Profile[];projects:Project[];bids:Bid[];messages:Message[];assets:Asset[];payments:Payment[];disputes:Dispute[];isAdmin:boolean};
export const emptySnapshot=():Snapshot=>({profiles:[],projects:[],bids:[],messages:[],assets:[],payments:[],disputes:[],isAdmin:false});
export const projectSchema=z.object({title:z.string().trim().min(8).max(120),description:z.string().trim().min(40).max(10000),category:z.enum(categories.slice(1) as [string,...string[]]),budget:z.coerce.number().int().min(25).max(10000),deadline:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>Number.isFinite(Date.parse(v))&&Date.parse(v)>Date.now(),'Choose a future deadline'),skills:z.array(z.string().trim().min(1).max(30)).max(8),resale_eligible:z.boolean(),customer_distribution_consent:z.boolean()});
export const bidSchema=z.object({project_id:z.string().min(1),amount:z.coerce.number().int().min(25).max(10000),days:z.coerce.number().int().min(1).max(60),proposal:z.string().trim().min(30).max(4000)});
export const profileSchema=z.object({name:z.string().trim().min(2).max(60),bio:z.string().trim().max(1000),skills:z.array(z.string().trim().min(1).max(30)).max(8)});
export const messageSchema=z.string().trim().min(1).max(4000);
export const money=(n:number)=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(n);
export const human=(v:string)=>new Date(v.length===10?v+'T12:00:00':v).toLocaleDateString('en-CA',{month:'short',day:'numeric'});
export const initials=(s:string)=>s.split(' ').slice(0,2).map(v=>v[0]).join('');
export const statusLabel=(s:Status)=>({open:'Open for proposals',awaiting_payment:'Awaiting funding',in_progress:'In progress',delivered:'Ready for review',approved:'Transfer pending',completed:'Completed',disputed:'Under review',refunded:'Refunded'}[s]);
export function assertParticipant(p:Project,user:string){if(!user||(p.owner_id!==user&&p.developer_id!==user))throw new Error('This workspace is private.');}
export function canTransition(p:Project,user:string,action:string){assertParticipant(p,user);if(action==='deliver')return p.developer_id===user&&p.status==='in_progress';if(action==='approve'||action==='revise')return p.owner_id===user&&p.status==='delivered';if(action==='dispute')return ['in_progress','delivered'].includes(p.status);return false;}
export function validateFile(f:{name:string;size:number}){if(f.size<1||f.size>10*1024*1024)throw new Error('Files must be between 1 byte and 10 MB.');if(!['pdf','txt','md','png','jpg','jpeg','webp','zip'].includes(f.name.split('.').pop()?.toLowerCase()||''))throw new Error('Use PDF, text, Markdown, images, or ZIP archives.');}
