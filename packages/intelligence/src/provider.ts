import type {
  ClassificationRequest,
  ClassificationResult,
  ExtractionRequest,
  ExtractionResult,
  SummaryRequest,
  SummaryResult,
} from "@oiw/contracts";

export interface IntelligenceProvider {
  extract(request: ExtractionRequest): Promise<ExtractionResult>;
  classify(request: ClassificationRequest): Promise<ClassificationResult>;
  summarise(request: SummaryRequest): Promise<SummaryResult>;
}
