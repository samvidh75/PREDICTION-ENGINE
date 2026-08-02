declare module '@xenova/transformers' {
  export function pipeline(task: string, model?: string): Promise<any>;
  
  export interface PipelineOptions {
    max_new_tokens?: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
  }
  
  interface Pipeline {
    (input: any, options?: any): Promise<any>;
  }
  
  const transformers: {
    pipeline: (task: string, model?: string) => Promise<Pipeline>;
  };
  
  export default transformers;
}
