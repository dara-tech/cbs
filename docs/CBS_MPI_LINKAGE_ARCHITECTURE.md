# CBS Master Patient Index (MPI) & Cross-System Linkage Architecture Blueprint

**Version:** 1.0.0  
**Target Systems:** DHIS2 NPD Surveillance & MySQL `main_dbs` (VCCT, Adult ART, Pediatric ART)  
**Author:** @architect (CBS Swarm)  
**Reviewers:** @matchengine, @uidesigner, @verifier, @coordinator  

---

## 1. Executive Summary & Problem Formulation

The National Center for HIV/AIDS, Dermatology and STDs (NCHADS) Cambodia operates several clinical and surveillance applications to achieve the UNAIDS 95-95-95 targets:
1. **DHIS2 NPD Tracker**: Key Population (KP) community prevention and active case surveillance.
2. **VCCT (Voluntary Confidential Counseling & Testing)**: Facility and mobile HIV testing, recency testing (RTRI/RITA), and counseling registry.
3. **ART (Antiretroviral Therapy - Adult & Pediatric)**: Longitudinal treatment records, viral load suppression, regimen transitions, and clinic appointment tracking.

### 1.1 The Linkage Dilemma
In the current CBS application (`d:\B\cbs`), cross-database record linkage relies exclusively on ad-hoc, exact string lookups between `uuic`, `pmrs_code`, `hts_code`, and legacy join tables `tblalink`/`tblclink`. Consequently:
- **Identifier Fragmentation**: A client tested at VCCT with PMRS `PMRS-9812` may be enrolled in ART under clinic number `104/2023` without an exact UUIC match in `tblalink`, or with typos in their UUIC.
- **Surveillance Isolation**: DHIS2 NPD Tracked Entity Instances (`trackedEntityInstance`) are isolated from clinical treatment outcomes.
- **Zero Governance & Traceability**: `tblalink`/`tblclink` lacks metadata for confidence scoring, auto vs. manual matching provenance, clinician verification status, review timestamps, or audit logs.
- **No Conflict Resolution**: Twin births, shared family contact numbers, and duplicate UUIC assignments cannot be resolved or recorded.

### 1.2 Architectural Objective
Deliver an enterprise-grade **Master Patient Index (MPI) & Linkage Registry** within CBS that:
- Harmonizes DHIS2 TEI IDs, VCCT IDs, and ART Clinic IDs into a unified **Golden Patient Entity**.
- Supports multi-tier deterministic and probabilistic linkage with confidence scoring.
- Implements rigorous human-in-the-loop review workflows (proposed, verified, rejected, conflicted).
- Maintains transactional integrity, historical audit logging, and full backward compatibility with legacy NCHADS systems.

---

## 2. Cross-System Schema Mapping & Entity Analysis

| Attribute Category | DHIS2 NPD Surveillance | MySQL VCCT (`vccts`) | MySQL Adult ART (`tblaimain`) | MySQL Pediatric ART (`tblcimain`) | Normalization Standard |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary System Key** | `trackedEntityInstance` (UID) | `(site_code, vcct_id)` | `(site_code, ClinicID)` | `(site_code, ClinicID)` | Composite Source Key |
| **Client Code (UUIC)** | Attribute `e5FXJFKQyuB` (also `HIM2iwwsilC`, `zIPLqQeF6H7`) | `uuic` (VARCHAR) | `tblalink.Codes` (`Typecode='UUIC'`) | `tblclink.Codes` (`Typecode='UUIC'`) | Uppercase alphanumeric, stripped spaces |
| **PMRS Code** | Raw attribute / notes | `pmrs_code` (VARCHAR) | `tblalink.Codes` (`Typecode='PMRS'`) | `tblclink.Codes` (`Typecode='PMRS'`) | Stripped prefix/dashes |
| **HTS / Testing Code** | Program stage data element | `hts_code` (VARCHAR) | Raw notes / referral data | Raw notes / referral data | Uppercase string |
| **Clinic ART Number** | N/A | Referral target code | `Artnum` (VARCHAR) | `Artnum` (VARCHAR) | Standardized clinic ART code |
| **Sex / Gender** | `BR1fUe7Nx8V` ("Male", "Female", "TG") | `sex`: `1`=Male, `2`=Female, `-1`=Unset | `Sex`: `1`=Male, `0`=Female, `-1`=Unset | `Sex`: `1`=Male, `0`=Female, `-1`=Unset | **Canonical Enum:** `M`, `F`, `TG`, `UNKNOWN` *(Note critical VCCT vs ART 0/2 female inversion)* |
| **Date of Birth** | `FmWxUZurqA8` (`YYYY-MM-DD`) | `dob` (`DATE`/`DATETIME`) | `DaBirth` (`DATE`/`DATETIME`) | `DaBirth` (`DATE`/`DATETIME`) | `YYYY-MM-DD` |
| **Phone Number** | Raw attribute / Stage data | `phone_number` (VARCHAR) | `tblaumain.Phone`, `Phone1` | `tblcumain.Phone`, `Phone1` | Normalized Cambodian digits (e.g., `012...` or `+855...`) |
| **National ID / IDPoor** | Raw attribute | `idpoor` (VARCHAR) | `tblalink.Codes` (`Typecode='IDPOOR'`) | `tblclink.Codes` (`Typecode='IDPOOR'`) | Alphanumeric clean string |
| **Facility / Site** | `orgUnit` (DHIS2 UID) | `site_code` (`tblsites.vcct_site_code`) | `site_code` (`tblsites.art_site_code`) | `site_code` (`tblsites.art_site_code`) | Facility mapping lookup via `tblsites` |

---

## 3. Data Model Blueprint: Master Patient Index (MPI)

The MPI database schema consists of four tables implemented in MySQL `main_dbs`:
1. `mpi_patients`: Canonical Master Record (The "Golden Record").
2. `mpi_client_links`: Relational and cross-system link registry binding source records to the MPI.
3. `mpi_link_audit_log`: Immutable compliance audit trail tracking every linkage mutation.
4. `mpi_match_rejections`: Exclusion registry ensuring dismissed false-positives are never re-proposed.

### 3.1 DDL Specification

```sql
-- =============================================================================
-- 1. Canonical Master Patient Entity (Golden Record)
-- =============================================================================
CREATE TABLE IF NOT EXISTS mpi_patients (
  mpi_patient_id CHAR(36) NOT NULL, -- UUIDv4
  canonical_uuic VARCHAR(50) DEFAULT NULL,
  canonical_first_name VARCHAR(100) DEFAULT NULL,
  canonical_last_name VARCHAR(100) DEFAULT NULL,
  canonical_gender ENUM('M', 'F', 'TG', 'OTHER', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  canonical_dob DATE DEFAULT NULL,
  canonical_phone VARCHAR(30) DEFAULT NULL,
  canonical_national_id VARCHAR(50) DEFAULT NULL,
  primary_site_code VARCHAR(20) DEFAULT NULL,
  is_merged TINYINT(1) NOT NULL DEFAULT 0,
  merged_into_mpi_id CHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NOT NULL DEFAULT 'system',
  
  PRIMARY KEY (mpi_patient_id),
  INDEX idx_canonical_uuic (canonical_uuic),
  INDEX idx_canonical_phone (canonical_phone),
  INDEX idx_canonical_dob_gender (canonical_dob, canonical_gender),
  INDEX idx_merged_lookup (is_merged, merged_into_mpi_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 2. Multi-System Linkage Registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS mpi_client_links (
  link_id BIGINT AUTO_INCREMENT NOT NULL,
  mpi_patient_id CHAR(36) NOT NULL,
  
  -- DHIS2 NPD Surveillance Reference
  dhis2_tei_id VARCHAR(64) DEFAULT NULL,
  
  -- VCCT Reference (MySQL vccts)
  vcct_site_code VARCHAR(20) DEFAULT NULL,
  vcct_id BIGINT DEFAULT NULL,
  
  -- ART Reference (MySQL tblaimain / tblcimain)
  art_site_code VARCHAR(20) DEFAULT NULL,
  art_clinic_id BIGINT DEFAULT NULL,
  art_is_child TINYINT(1) NOT NULL DEFAULT 0,
  art_artnum VARCHAR(50) DEFAULT NULL,
  
  -- Snapshot Identifiers at Linkage Time
  matched_uuic VARCHAR(50) DEFAULT NULL,
  matched_pmrs VARCHAR(50) DEFAULT NULL,
  matched_hts VARCHAR(50) DEFAULT NULL,
  matched_phone VARCHAR(30) DEFAULT NULL,
  
  -- Link Evaluation & Provenance
  confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0.00, -- 0.00% to 100.00%
  linkage_method ENUM(
    'auto_deterministic', 
    'auto_probabilistic', 
    'manual_verified', 
    'manual_overridden', 
    'legacy_sync'
  ) NOT NULL DEFAULT 'manual_verified',
  linkage_status ENUM(
    'proposed', 
    'verified', 
    'rejected', 
    'conflicted', 
    'unlinked'
  ) NOT NULL DEFAULT 'proposed',
  
  -- Machine/Algorithm Evidence Payload
  match_criteria JSON DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  
  -- Verification & Governance
  linked_by VARCHAR(100) NOT NULL DEFAULT 'system',
  verified_by VARCHAR(100) DEFAULT NULL,
  verified_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (link_id),
  CONSTRAINT fk_mpi_client_links_patient 
    FOREIGN KEY (mpi_patient_id) REFERENCES mpi_patients(mpi_patient_id) 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  -- Fast lookup and uniqueness constraints
  INDEX idx_mpi_patient_id (mpi_patient_id),
  INDEX idx_dhis2_tei (dhis2_tei_id),
  INDEX idx_vcct_record (vcct_site_code, vcct_id),
  INDEX idx_art_record (art_site_code, art_clinic_id, art_is_child),
  INDEX idx_status_score (linkage_status, confidence_score),
  INDEX idx_matched_uuic (matched_uuic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 3. Immutable Linkage Audit Log
-- =============================================================================
CREATE TABLE IF NOT EXISTS mpi_link_audit_log (
  audit_id BIGINT AUTO_INCREMENT NOT NULL,
  link_id BIGINT NOT NULL,
  mpi_patient_id CHAR(36) NOT NULL,
  action ENUM(
    'LINK_PROPOSED',
    'LINK_VERIFIED',
    'LINK_REJECTED',
    'LINK_UNLINKED',
    'LINK_CONFLICT_RESOLVED',
    'PATIENT_MERGED',
    'PATIENT_SPLIT',
    'LEGACY_SYNCED'
  ) NOT NULL,
  previous_status VARCHAR(30) DEFAULT NULL,
  new_status VARCHAR(30) NOT NULL,
  previous_state JSON DEFAULT NULL,
  new_state JSON NOT NULL,
  reason TEXT DEFAULT NULL,
  performed_by VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (audit_id),
  INDEX idx_audit_link (link_id),
  INDEX idx_audit_mpi_patient (mpi_patient_id),
  INDEX idx_audit_action_time (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 4. Match Rejection Memory (False Positive Suppression)
-- =============================================================================
CREATE TABLE IF NOT EXISTS mpi_match_rejections (
  rejection_id BIGINT AUTO_INCREMENT NOT NULL,
  source_system ENUM('dhis2', 'vcct', 'art') NOT NULL,
  source_record_key VARCHAR(100) NOT NULL, -- e.g. "TEI_abc123", "0101_5432"
  target_system ENUM('dhis2', 'vcct', 'art') NOT NULL,
  target_record_key VARCHAR(100) NOT NULL,
  rejected_by VARCHAR(100) NOT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (rejection_id),
  UNIQUE KEY uq_rejection_pair (source_system, source_record_key, target_system, target_record_key),
  INDEX idx_rejection_source (source_system, source_record_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 Backward Compatibility with Legacy `tblalink` & `tblclink`

To guarantee zero regression for existing ART electronic reporting modules and reports:
1. **Bi-Directional Synchronization Hook**:
   When a link to an ART enrollment `(art_site_code, art_clinic_id)` is verified:
   - Check if an entry exists in `tblalink` (for adults) or `tblclink` (for children) matching `(site_code, ClinicID, Codes = matched_uuic)`.
   - If missing, auto-insert:
     ```sql
     INSERT INTO tblalink (site_code, ClinicID, Codes, Typecode)
     VALUES (?, ?, ?, 'UUIC')
     ON DUPLICATE KEY UPDATE Typecode = VALUES(Typecode);
     ```
2. **Read Fallback**:
   The existing `getClientProfileByCodes()` in `mysqlClient.ts` will continue to read `tblalink`/`tblclink`, while simultaneously querying `mpi_client_links` to resolve cross-system profiles dynamically.

---

## 4. API Architecture & Endpoint Specifications

All endpoints are implemented as Next.js Route Handlers (`src/app/api/linkage/...`).

### 4.1 Endpoint Overview
- `GET /api/linkage/candidates`: Computes and ranks candidate matching records for a given patient.
- `POST /api/linkage/link`: Creates or verifies a link across DHIS2, VCCT, and ART.
- `DELETE /api/linkage/unlink`: Unlinks or dismisses a proposed/verified link with audit rationale.
- `GET /api/linkage/stats`: Aggregates real-time linkage cascade metrics and unlinked case queues.

---

### 4.2 Endpoint: `GET /api/linkage/candidates`

#### Query Parameters:
| Param | Type | Description |
| :--- | :--- | :--- |
| `sourceSystem` | `'dhis2' \| 'vcct' \| 'art'` | The system originating the lookup |
| `sourceId` | `string` | Primary ID in source system (e.g. TEI UID, `0101-5231`) |
| `uuic` | `string` (optional) | Override or filter UUIC |
| `name` | `string` (optional) | Client full name (Khmer or Latin) |
| `phone` | `string` (optional) | Phone number |
| `dob` | `string` (optional) | Date of birth (`YYYY-MM-DD`) |
| `sex` | `string` (optional) | Normalized sex (`M`, `F`, `TG`) |
| `minScore` | `number` (optional) | Minimum confidence score threshold (default: `60`) |
| `limit` | `number` (optional) | Max candidates returned (default: `10`, max: `50`) |

#### Response Schema:
```json
{
  "ok": true,
  "source": {
    "system": "dhis2",
    "id": "MCPQUTHX1Ze_tei89",
    "uuic": "BATB010195",
    "name": "Chan Sokha",
    "dob": "1995-04-12",
    "gender": "F",
    "phone": "012889977",
    "orgUnit": "vUs2cBkPn50"
  },
  "candidates": [
    {
      "candidateKey": "vcct-0101-4921",
      "system": "vcct",
      "siteCode": "0101",
      "siteName": "Battambang RH",
      "recordId": 4921,
      "uuic": "BATB010195",
      "pmrsCode": "PMRS-4921",
      "htsCode": "HTS-882",
      "name": "Chan Sokha",
      "dob": "1995-04-12",
      "gender": "F",
      "phone": "012889977",
      "testResult": "Positive",
      "testDate": "2023-08-15",
      "score": 98.5,
      "confidenceCategory": "HIGH",
      "matchCriteria": {
        "exactUuic": true,
        "exactDob": true,
        "exactGender": true,
        "exactPhone": true,
        "nameSimilarity": 1.00
      },
      "existingLinkStatus": "none"
    },
    {
      "candidateKey": "art-0101-1029",
      "system": "art",
      "siteCode": "0101",
      "siteName": "Battambang RH ART Clinic",
      "recordId": 1029,
      "isChild": false,
      "artnum": "1029/08",
      "uuic": "BATB010195",
      "dob": "1995-04-12",
      "gender": "F",
      "phone": "012889977",
      "artStartDate": "2023-08-20",
      "status": "Active",
      "score": 96.0,
      "confidenceCategory": "HIGH",
      "matchCriteria": {
        "exactUuic": true,
        "exactDob": true,
        "exactGender": true,
        "exactPhone": true
      },
      "existingLinkStatus": "none"
    }
  ]
}
```

---

### 4.3 Endpoint: `POST /api/linkage/link`

#### Request Payload:
```json
{
  "mpiPatientId": "b18b43d2-3c12-4c6e-8211-8ecb164f9812", // optional; generated if empty
  "dhis2TeiId": "MCPQUTHX1Ze_tei89",
  "vcct": {
    "siteCode": "0101",
    "vcctId": 4921
  },
  "art": {
    "siteCode": "0101",
    "clinicId": 1029,
    "isChild": false,
    "artnum": "1029/08"
  },
  "linkageMethod": "manual_verified",
  "linkageStatus": "verified",
  "confidenceScore": 98.5,
  "matchCriteria": {
    "exactUuic": true,
    "exactDob": true,
    "exactPhone": true
  },
  "notes": "Verified by Surveillance Officer after phone consultation with client.",
  "user": "sokha_nchads"
}
```

#### Transactional Business Logic:
1. **Concurrency & Conflict Check**:
   - Verify that neither `dhis2TeiId`, `(vcct_site_code, vcct_id)`, nor `(art_site_code, art_clinic_id)` is actively linked (`status='verified'`) to a different `mpi_patient_id`.
   - If an active link exists to another patient, return `409 Conflict` with the conflicting record details.
2. **Golden Record Maintenance**:
   - If `mpiPatientId` is provided, fetch `mpi_patients`. If omitted, generate a new UUIDv4 and synthesize canonical demographics from the highest-trust source (ART > VCCT > DHIS2).
3. **Registry Insertion**:
   - Insert into `mpi_client_links` with status `verified`, capturing user and timestamp.
4. **Legacy Compatibility Sync**:
   - If ART record is linked, automatically update `tblalink`/`tblclink`.
5. **Audit Logging**:
   - Insert record into `mpi_link_audit_log` with action `'LINK_VERIFIED'`.

#### Response:
```json
{
  "ok": true,
  "linkId": 1054,
  "mpiPatientId": "b18b43d2-3c12-4c6e-8211-8ecb164f9812",
  "linkageStatus": "verified",
  "message": "Patient successfully linked across surveillance, VCCT, and ART systems."
}
```

---

### 4.4 Endpoint: `DELETE /api/linkage/unlink`

#### Request Payload:
```json
{
  "linkId": 1054,
  "reason": "Clinician discovered mismatched DOB upon physical clinic booklet inspection. Patient is fraternal twin.",
  "markAsRejected": true,
  "user": "dr_sopheap"
}
```

#### Transactional Business Logic:
1. Retrieve link details from `mpi_client_links`.
2. If `markAsRejected = true`:
   - Set `linkage_status = 'rejected'`.
   - Insert exclusion entry into `mpi_match_rejections` to prevent auto-match algorithms from suggesting this pair again.
3. If complete severance: set `linkage_status = 'unlinked'`.
4. Log full snapshot before and after mutation in `mpi_link_audit_log`.

#### Response:
```json
{
  "ok": true,
  "linkId": 1054,
  "linkageStatus": "rejected",
  "message": "Link successfully severed and added to exclusion memory."
}
```

---

### 4.5 Endpoint: `GET /api/linkage/stats`

#### Query Parameters:
`period` (optional, e.g. `2026Q1`), `provinceId`, `odCode`, `siteCode`.

#### Response Schema:
```json
{
  "ok": true,
  "summary": {
    "totalDhis2Cases": 14205,
    "totalVcctCases": 8340,
    "totalArtCases": 7910,
    "totalLinkedGoldenPatients": 6890,
    "cascadeLinkageRate": 82.6
  },
  "statusBreakdown": {
    "verified": 6120,
    "proposed": 540,
    "conflicted": 48,
    "rejected": 182
  },
  "methodBreakdown": {
    "auto_deterministic": 4890,
    "auto_probabilistic": 1230,
    "manual_verified": 770
  },
  "cascadeGaps": {
    "vcctPositiveNotLinkedToArt": 142,
    "dhis2NpdNotLinkedToVcct": 810
  },
  "topSitesPendingReview": [
    {
      "siteCode": "0101",
      "siteName": "Battambang RH",
      "pendingProposedCount": 42,
      "unlinkedHivPositiveCount": 18
    }
  ]
}
```

---

## 5. Cross-Swarm Actionable Contracts

### 5.1 For @matchengine (Matching Engine & Scoring Rules)
1. **Input Payload**: Engine must consume candidate search criteria from `GET /api/linkage/candidates` and evaluate against `mpi_match_rejections`.
2. **Criteria JSON Structure**: Save exact rule evaluations in the JSON format:
   ```json
   {
     "exactUuic": true,
     "exactPmrs": false,
     "phoneMatch": true,
     "dobDiffDays": 0,
     "nameLevenshtein": 0.94,
     "siteProximityScore": 10
   }
   ```
3. **Data Encoding Safeguard**: Account for the sex code discrepancy:
   - VCCT: `1` = Male, `2` = Female
   - ART: `1` = Male, `0` = Female
   - Normalize both to standard `M` or `F` before matching!

### 5.2 For @uidesigner (UI/UX & User Workflows)
1. **Link Status Badges**:
   - `verified`: Emerald Green (`bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30`)
   - `proposed`: Amber (`bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30`)
   - `conflicted`: Rose/Red (`bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30`)
   - `unlinked`: Slate/Gray (`bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30`)
2. **Candidate Diff View**: Render `source` vs `candidates[i]` with diff highlighting on matched attributes.
3. **Linkage Hub Queue**: The `cascadeGaps.vcctPositiveNotLinkedToArt` metric drives the high-priority "Unlinked HIV+ VCCT" clinical outreach tab in the new Linkage Hub.

### 5.3 For @verifier (Verification & Edge Case Protocol)
1. **Transactional Safety**: All mutations in `/api/linkage/link` and `/unlink` run under `SERIALIZABLE` or `READ COMMITTED` transactions with row locking on `mpi_client_links`.
2. **Confidentiality Compliance**: Patient names and phone numbers are scrubbed or masked in client-side analytics logs in accordance with Cambodian National HIV Privacy Regulations.
3. **Audit Immutability**: `mpi_link_audit_log` accepts `INSERT` only; no `UPDATE` or `DELETE` grants.

---
*End of Blueprint — Approved by System Architect*
