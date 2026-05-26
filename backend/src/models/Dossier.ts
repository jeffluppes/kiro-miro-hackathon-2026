export type DossierStatus = 'melding' | 'triage' | 'onderzoek' | 'actie' | 'afronding';
export type DossierPriority = 'kritiek' | 'hoog' | 'gemiddeld' | 'laag';
export type DossierSeverity = 'mild' | 'prolonged' | 'severe';

export interface Dossier {
  dossierId: string;
  teacherId?: string;
  studentId?: string;
  status: DossierStatus;
  priority: DossierPriority;
  severity: DossierSeverity;
  incidentType: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
