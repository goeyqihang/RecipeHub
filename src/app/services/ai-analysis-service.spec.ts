import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AiAnalysisService } from './ai-analysis-service';

describe('AiAnalysisService', () => {
  let service: AiAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AiAnalysisService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
