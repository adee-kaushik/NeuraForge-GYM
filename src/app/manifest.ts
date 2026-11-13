import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
 return {id:'/',name:'NeuraFitness',short_name:'NeuraFitness',description:'Your gym, members and fitness plans',start_url:'/',scope:'/',display:'standalone',background_color:'#F8F7F3',theme_color:'#F8F7F3',icons:[{src:'/icon.png',sizes:'any',type:'image/png',purpose:'any'}],shortcuts:[{name:'Member panel',url:'/member'},{name:'Workout & Diet',url:'/member/plans'}]};
}
