// Add scoped color overrides; leave existing dimensions, keyframes and dark theme intact.
const fs = require('node:fs');
const postcss = require('postcss');
const files = [
 'components/contygo/rebuild/ServiceCinemaDialog.module.css',
 'components/contygo/rebuild/ServiceIntroFilm.module.css',
 'components/contygo/juvenil/VisaJuvenilExperience.module.css',
 'components/contygo/juvenil/VisaJourneyReveal.module.css',
 'components/contygo/juvenil/PaperPlaneClosing.module.css',
 'components/contygo/juvenil/ExternalVideoCaptions.module.css',
 'components/contygo/juvenil/VisaStatePicker.module.css',
 'components/contygo/juvenil/ThinkingOverlay.module.css',
];
const marker = '/* CONTYGO LIGHT APPEARANCE: color-only overrides */';
// Hand-tuned light layer written after the generated block; it is carried over on every run.
const dayMarker = '/* CONTYGO DÍA: hand-tuned light appearance */';
function replaceHex(value, family, rgb) {
 return value.replace(/#[0-9a-f]{3,8}\b/gi, hex => {
   const raw = hex.slice(1).toLowerCase();
   let base = raw.slice(0,6), alpha = raw.length === 8 ? parseInt(raw.slice(6),16)/255 : 1;
   if(raw.length === 3 || raw.length === 4) { base = raw.slice(0,3).split('').map(c=>c+c).join(''); alpha = raw.length === 4 ? parseInt(raw[3]+raw[3],16)/255 : 1; }
   if(!family.includes(base)) return hex;
   return `rgba(${rgb},${Number(alpha.toFixed(3))})`;
 });
}
function lightValue(prop, value) {
 let result=value;
 if(prop==='color') {
   result=replaceHex(result,['ffffff','f6f8f7'],'6,27,61');
   result=result.replace(/rgb\(246\s+248\s+247\s*\/\s*([^)]*)\)/gi,'rgb(6 27 61 / $1)');
   result=result.replace(/#25d366\b/gi,'#087f46');
 }
 if(['background','background-color'].includes(prop)) {
   result=replaceHex(result,['061b3d'],'255,255,255');
   result=result.replace(/rgb\(6\s+27\s+61\s*\/\s*([^)]*)\)/gi,'rgb(255 255 255 / $1)');
 }
 if(['border','border-color','border-top','border-bottom','border-left','border-right','outline','outline-color'].includes(prop)) {
   result=replaceHex(result,['ffffff','f6f8f7'],'6,27,61');
 }
 return result;
}
for(const file of files) {
 const source=fs.readFileSync(file,'utf8');
 const day=source.includes(dayMarker)?'\n\n'+dayMarker+source.split(dayMarker)[1].trimEnd():'';
 const original=source.split(dayMarker)[0].split(marker)[0].trimEnd();
 const tree=postcss.parse(original);
 const output=postcss.root();
 tree.walkRules(rule=>{
   let parent=rule.parent;
   while(parent && parent.type!=='root'){if(parent.type==='atrule' && /keyframes/i.test(parent.name))return;parent=parent.parent;}
   const declarations=[];
   rule.nodes.forEach(node=>{if(node.type!=='decl')return;const value=lightValue(node.prop,node.value);if(value!==node.value)declarations.push(postcss.decl({prop:node.prop,value,important:node.important}));});
   if(!declarations.length)return;
   const mapped=postcss.rule({selector:rule.selectors.map(selector => `:global([data-contygo-theme=light]) ${selector}`).join(',\n')});
   mapped.append(declarations);
   const parents=[];parent=rule.parent;
   while(parent && parent.type!=='root'){if(parent.type==='atrule')parents.unshift(parent);parent=parent.parent;}
   let destination=output;
   for(const ancestor of parents){const wrapper=postcss.atRule({name:ancestor.name,params:ancestor.params});destination.append(wrapper);destination=wrapper;}
   destination.append(mapped);
 });
 fs.writeFileSync(file,original+'\n\n'+marker+'\n'+output.toString()+day+'\n');
 console.log(file,output.nodes.length,'color rules');
}
