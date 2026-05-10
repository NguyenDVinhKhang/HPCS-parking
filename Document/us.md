International School
Capstone Project 1
CMU-SE 450 – C1SE.82
User Story Document
Version 1.0
Date: March 29th, 2026
Hybrid Parking Control System
(HPCS)
Submitted by
Ninh, Vu Ha
Hieu, Le Minh
Khang, Nguyen Dinh Vinh
Dung, Le Trung
Nhat, Le Van
Approved by
Trung, Tran Thanh
PROJECT INFORMATION
DOCUMENT NAME
REVISION HISTORY
TABLE OF CONTENTS
TABLE OF TABLES
1. Introduction
HPCS is designed to reduce operating costs, congestion, human error, and fraud in campus parking by combining pay-before-entry processing, license plate recognition, automated barrier control, and supervised intervention when needed. This user story document restates the approved project scope from the perspective of the actors who interact with the system.
1.1 Document Overview
• Explain how drivers, faculty/staff, visitors, administrators, and supporting technical roles interact with the Hybrid Parking Control System (HPCS).
• Translate the approved HPCS backlog into concise and testable user stories with measurable acceptance criteria where proposal thresholds are available.
• Keep the story set aligned with the approved scope, excluding remote mobile booking, long-term AI vehicle tracking, and external parking-lot accounting.
• Preserve traceability to Product Backlog items PB01–PB20.
1.2 User Needs
The HPCS user community includes several operational viewpoints, each with distinct needs at the gate and in the supporting administration workflow:
• Drivers / Users need a fast, clear, and reliable entry and exit flow that does not require manual ticket collection at exit.
• Student card holders need contactless entry-payment support tied to valid student credentials, while visitors still need a cash payment option.
• Faculty and staff on the whitelist need recognized free access without losing transaction traceability.
• Administrators and security staff need protected access to transaction logs, whitelist rules, dashboard reports, and device status information.
• University management, IT, and finance stakeholders need secure reporting, continuity, and an architecture that can scale to multiple gates over time.
2. User Story of “Hybrid Parking Control System (HPCS)”
The following user stories are derived directly from the approved HPCS proposal and aligned with the Product Backlog. Each story is written to support implementation, validation, and sprint-level traceability.
2.1 US01 – [Driver / User] Entry Vehicle Detection and Plate Capture
Table 1. US01 – [Driver / User] Entry Vehicle Detection and Plate Capture
Acceptance criteria
• When a vehicle stops in the designated detection area, the entry camera captures at least one usable image for processing.
• The system stores the recognized license plate, gate identifier, and entry timestamp with the pending transaction record.
• If recognition is uncertain or no plate is detected, the gate flow remains pending and the user receives a clear retry or assistance prompt.
• The entry transaction is not finalized until the captured plate data is associated with the entry event.
• Entry capture events are written to the transaction log for later audit and matching at exit.
Story
This story ensures that every parking transaction starts with a traceable entry event, giving HPCS the data foundation needed for payment, ticket issuance, and exit verification.
2.2 US02 – [Student Card Holder / Visitor] Prepaid Entry Payment
Table 2. US02 – [Student Card Holder / Visitor] Prepaid Entry Payment
Acceptance criteria
• The kiosk supports a contactless student ID card flow and a cash payment flow for entry payment.
• The system records the selected payment method, transaction status, gate identifier, and timestamp for every payment attempt.
• Entry authorization is granted only after the payment status is confirmed as successful.
• If payment fails, times out, or is cancelled, the barrier remains closed and the user receives a clear retry or assistance message.
• The prepaid process is designed to support the HPCS performance target in which payment confirmation and ticket issuance complete within 5 seconds under normal operation.
Story
This story implements the pay-before-entry model that differentiates HPCS from traditional pay-at-exit parking, helping reduce congestion and improve fee control.
2.3 US03 – [Driver / User] Parking Card/Ticket Issuance
Table 3. US03 – [Driver / User] Parking Card/Ticket Issuance
Acceptance criteria
• After successful payment or whitelist approval, the system issues one parking card or ticket for the current transaction.
• The issued credential is linked to the transaction identifier and stored in the backend before the barrier opens.
• No parking card or ticket is issued when payment is unconfirmed or whitelist validation fails.
• If the dispenser or issuer reports an error, the transaction is flagged, the barrier remains closed, and the event is logged for operator review.
• Payment confirmation and card/ticket issuance together meet the HPCS target of completion within 5 seconds under normal operation.
Story
This story provides the physical credential needed for controlled exit processing while keeping the entry workflow automated and auditable.
2.4 US04 – [Driver / User] Safe Entry Barrier Operation
Table 4. US04 – [Driver / User] Safe Entry Barrier Operation
Acceptance criteria
• The barrier opens only when the system confirms a valid payment or an approved whitelist entry flow.
• Barrier open and close commands are triggered by the authorized gate workflow and recorded in the transaction log.
• If the transaction is invalid, incomplete, or cancelled, the barrier stays closed.
• The barrier closes automatically after the vehicle clears the passage area or the configured gate-complete signal is received.
• When an exception occurs, the system supports supervised control by authorized operational staff without bypassing transaction logging.
Story
This story turns payment and validation decisions into a safe physical gate action, which is essential for real-world control of parking access.
2.5 US05 – [Faculty / Staff Whitelist User] Free-Access Entry via Whitelist
Table 5. US05 – [Faculty / Staff Whitelist User] Free-Access Entry via Whitelist
Acceptance criteria
• The system checks the presented vehicle or linked access credential against the maintained whitelist before asking for payment when the configured free-access policy applies.
• An approved whitelist match bypasses the payment step and allows the normal card/ticket issuance and barrier workflow to continue.
• A failed whitelist match returns the user to the standard prepaid entry flow instead of granting access.
• Whitelist-based transactions are logged with a status that distinguishes them from paid entries.
• Only eligible lecturer and administrator records maintained by authorized staff can trigger free-access treatment.
Story
This story supports university access policy by allowing approved internal users to use the parking service without paying while still preserving full transaction traceability.
2.6 US06 – [Driver / User] Exit Validation and Plate Re-Match
Table 6. US06 – [Driver / User] Exit Validation and Plate Re-Match
Acceptance criteria
• At the exit gate, the system reads the presented parking card or ticket and retrieves the related entry transaction.
• The exit camera captures the current license plate and compares it with the plate stored at entry for the same transaction.
• When the credential and plate match an open transaction, the system opens the exit barrier without requesting an additional payment.
• Exit verification is completed within 3 seconds under normal operating conditions.
• If no valid transaction is found or the exit plate does not match, the barrier remains closed and the exception is logged.
Story
This story completes the HPCS parking lifecycle and enforces the pay-before-entry model by validating exits through credential and plate re-matching instead of collecting fees at departure.
2.7 US07 – [Driver / User] Gate Guidance through LED and Voice
Table 7. US07 – [Driver / User] Gate Guidance through LED and Voice
Acceptance criteria
• The kiosk displays step-based LED guidance for entry capture, payment, card/ticket collection, and exit validation.
• Optional voice guidance is available for users who need audible instructions at the gate.
• Error states, such as unreadable plate capture, failed payment, or invalid exit validation, show clear next-step guidance.
• Operational messages are aligned with the current gate state so users are not shown contradictory instructions.
• Guidance content supports the HPCS usability requirement and does not replace transaction or exception logging.
Story
This story improves usability at the gate, helping drivers complete transactions quickly and reducing the operational burden on staff.
2.8 US08 – [Admin] Secure Administrator Authentication and Authorization
Table 8. US08 – [Admin] Secure Administrator Authentication and Authorization
Acceptance criteria
• Only authenticated administrators can access management pages, operational dashboards, and protected system settings.
• The authentication flow uses secure administrator credentials and supports role-based authorization for protected functions.
• Invalid or expired credentials are rejected before any protected data is returned.
• Administrative actions are associated with the authenticated user account for audit purposes.
• Access to sensitive features such as whitelist maintenance, reports, and protected transaction data is blocked for unauthorized users.
Story
This story protects HPCS operational control surfaces so that only authorized staff can manage access rules, review data, and supervise the parking system.
2.9 US09 – [Admin] Whitelist and Access Policy Management
Table 9. US09 – [Admin] Whitelist and Access Policy Management
Acceptance criteria
• Authorized administrators can add, update, disable, or remove whitelist records for lecturers and administrators.
• Each whitelist entry stores the identifying information required by the configured free-access policy, such as linked vehicle or credential information where available.
• Duplicate, incomplete, or invalid whitelist entries are rejected with a clear validation message.
• Whitelist changes take effect in subsequent gate validation without requiring manual database edits.
• Every whitelist change is logged with the acting administrator and timestamp.
Story
This story allows HPCS administrators to keep free-access policy accurate and current, ensuring that eligible users are handled correctly without weakening operational control.
2.10 US10 – [Admin / Security Operator] Transaction and Gate Event Logging
Table 10. US10 – [Admin / Security Operator] Transaction and Gate Event Logging
Acceptance criteria
• The system records license plate number, timestamps, payment method, transaction status, and gate information for each parking transaction.
• Both successful and failed validation events are retained in the log so that exceptions remain traceable.
• Log records remain accessible to authorized operational roles for audit and reporting purposes.
• Completed log records are protected against unauthorized modification through role-based access control.
• Logging covers entry capture, payment, credential issuance, barrier actions, exit validation, and exception outcomes.
Story
This story provides the audit trail that HPCS needs for security, reporting, revenue oversight, and troubleshooting of field incidents.
2.11 US11 – [Admin / Security Operator] Operational Dashboard and Reports
Table 11. US11 – [Admin / Security Operator] Operational Dashboard and Reports
Acceptance criteria
• The dashboard displays total vehicles, revenue statistics, occupancy status, and recognition accuracy as proposed for HPCS.
• Dashboard values are derived from stored transaction and gate event data rather than manual entry.
• Authorized administrators and security operators can access reporting information relevant to their role.
• Report views do not allow unauthorized users to change stored transaction data.
• Operational summaries can distinguish paid transactions, whitelist transactions, and exception cases.
Story
This story turns raw transaction data into actionable operational visibility for campus parking managers and supervisors.
2.12 US12 – [Security Staff / Operational Supervisor] Device Status Monitoring
Table 12. US12 – [Security Staff / Operational Supervisor] Device Status Monitoring
Acceptance criteria
• The monitoring view shows the latest status of the camera, barrier controller, card reader, parking card/ticket dispenser, LED or speaker unit, and cash module where installed.
• Device communication failures or unavailable components are surfaced as visible status issues for authorized operators.
• The monitoring view is accessible only to roles assigned operational oversight responsibilities.
• Status updates and device-related errors are logged for later diagnosis.
• Monitoring supports supervised control by helping staff identify which device or lane component requires intervention.
Story
This story helps HPCS remain practical in the field by giving operational staff clear visibility into the hardware chain behind each automated gate decision.
2.13 US13 – [System] Encrypted Storage and Protected Access
Table 13. US13 – [System] Encrypted Storage and Protected Access
Acceptance criteria
• All stored transaction and payment data is protected using the encryption and secure storage approach defined for the implementation.
• Access to the database or service endpoints containing license plate records is limited through role-based access control.
• Only authenticated and authorized users can retrieve protected operational data.
• Sensitive data is not exposed on the public-facing gate interface beyond what is required for the current step.
• Security-relevant access attempts and protected administrative actions are logged for audit purposes.
Story
This story implements the core HPCS security requirement so that automation does not create unacceptable exposure of payment or vehicle identity data.
2.14 US14 – [System] Performance Compliance at Gate
Table 14. US14 – [System] Performance Compliance at Gate
Acceptance criteria
• Under normal operating conditions, payment confirmation and parking card/ticket issuance complete within 5 seconds.
• Under normal operating conditions, exit verification completes within 3 seconds.
• Performance measurement is applied to the core entry and exit workflows rather than to isolated screen rendering alone.
• Transactions that exceed the target thresholds can be identified through system logging for diagnostics and tuning.
• The system maintains performance targets without bypassing required validation, security, or transaction recording steps.
Story
This story operationalizes the main non-functional requirement that HPCS must be fast enough to reduce congestion while still enforcing secure validation.
2.15 US15 – [System] Continuous Operation and LPR Accuracy
Table 15. US15 – [System] Continuous Operation and LPR Accuracy
Acceptance criteria
• The system is designed to support continuous 24/7 operation for routine campus parking use.
• In controlled conditions, the plate recognition service targets an accuracy rate in the 90–95% range defined in the proposal.
• When recognition confidence is insufficient, the system keeps the transaction pending instead of granting access automatically.
• Transient hardware or communication issues do not silently discard transaction records that have already been created.
• Operational logs provide enough context to review availability issues and recognition problems after an incident.
Story
This story captures the reliability expectations that make HPCS viable beyond a demonstration, especially where dependable operation and recognition quality are critical.
2.16 US16 – [System] Deny Exit on Invalid or Mismatched Data
Table 16. US16 – [System] Deny Exit on Invalid or Mismatched Data
Acceptance criteria
• The barrier remains closed if the presented parking card or ticket cannot be read or does not map to an open transaction.
• The barrier remains closed when the exit license plate does not match the entry plate associated with the transaction.
• The system does not request an additional payment at exit because HPCS uses a pay-before-entry process.
• Every denied exit event is logged with the reason for rejection and the gate identifier.
• The gate interface gives the user a clear assistance message so that security staff can handle the exception when needed.
Story
This story enforces the core security check at exit, ensuring that HPCS protects against ticket misuse, incorrect vehicle release, and fraud.
2.17 US17 – [System] Multi-Gate Scalability
Table 17. US17 – [System] Multi-Gate Scalability
Acceptance criteria
• Transaction records include the gate identifier so multiple lanes can share a common operational data model.
• The architecture supports adding additional entry or exit gates without rewriting the core payment, validation, and logging logic.
• Multiple gates can work against the same transaction store while keeping transaction state consistent.
• Reporting can distinguish activity by gate after expansion.
• Scalability preparation does not introduce unsupported future-scope features such as remote booking or external parking-lot accounting.
Story
This story prepares HPCS for campus growth by making expansion feasible while staying within the currently approved project scope.
2.18 US18 – [Developer] Hardware Integration Framework
Table 18. US18 – [Developer] Hardware Integration Framework
Acceptance criteria
• The backend exchanges commands or events with the camera, barrier controller, card reader, card/ticket dispenser, and cash module through defined interfaces.
• Integration logic supports the technology direction proposed for HPCS, including Python backend services and Arduino or Raspberry Pi based hardware control.
• Hardware communication failures are detected, surfaced, and logged instead of being ignored silently.
• Device responses are tied to the correct transaction context before the gate workflow proceeds.
• The integration design supports incremental testing so hardware and software issues can be isolated during development.
Story
This story enables the software and device layers of HPCS to function as one solution instead of disconnected modules.
2.19 US19 – [Developer] Containerized Environment and Deployment
Table 19. US19 – [Developer] Containerized Environment and Deployment
Acceptance criteria
• Core application services can be packaged and run using Docker as proposed in the project technology context.
• Environment-specific settings are externalized so the same build can be used across development and test environments with appropriate configuration.
• Containerized execution does not change the intended behavior of gate workflows, logging, or protected access controls.
• Setup and run instructions are documented for the project team.
• The deployment approach remains aligned with the approved HPCS scope and does not introduce unsupported product features.
Story
This story improves delivery discipline by giving the team a repeatable environment for integrating software services and hardware-facing components.
2.20 US20 – [System] Student ID Data Source Integration
Table 20. US20 – [System] Student ID Data Source Integration
Acceptance criteria
• The contactless student card flow validates the presented card against the configured university data source or compatible integration endpoint.
• Only recognized and valid card data can be used to continue the card-based entry process.
• If the external data source is unavailable or the card cannot be validated, the user receives a clear failure or fallback message and unauthorized access is not granted.
• Card validation attempts and outcomes are logged with the related transaction context.
• The integration follows the same protected-access principles used for other sensitive HPCS data flows.
Story
This story connects the HPCS entry process to the university ecosystem so that student-card-based access and payment are practical in real operation.


--- TABLES ---

Proposal Review Panel Representative | Signature | Date
Name |  | 
Capstone Project 1 – Mentor: Trung, Tran Thanh |  | 

Project acronym | HPCS
Project Title | Hybrid Parking Control System
Start Date | February 24th, 2026
End Date | June 20th, 2026
Lead Institution | International School, Duy Tan University
Project Mentor | Trung, Tran Thanh Email: trantrungs269@gmail.com
Project Leader & contact details | Khang, Nguyen Dinh Vinh Email: khanglucky@gmail.com Tel: 0704667333 Student ID: 28211141406
Scrum Master & contact details | Ninh, Vu Ha Email: vuhaninh@dtu.edu.vn Tel: 0352637790 Student ID: 28211105939
Partner Organization | Duy Tan University
Project Web URL | 

Student ID | Name | Email | Tel | Role
28211105939 | Ninh, Vu Ha | vuhaninh@dtu.edu.vn | 0352637790 | Scrum Master
28219045377 | Hieu, Le Minh | xeniellq1@gmail.com | 0777440100 | Team Member
28211141406 | Khang, Nguyen Dinh Vinh | khanglucky@gmail.com | 0704667333 | Project Leader
28210239671 | Dung, Le Trung | dunglt.bon245@gmail.com | 0766674467 | Team Member
28218044202 | Nhat, Le Van | nhatle08052004n@gmail.com | 0394441571 | Team Member

Document Title | User Story Document
Author(s) | HPCS Project Team
Role | Project Team
Date | March 29th, 2026
File name | C1SE.82_UserStory_HPCS_ver1.0.docx

Version | Person(s) | Date | Description
1.0 | HPCS Project Team | 29-Mar-2026 | Initial release of the HPCS User Story document.

Section | Title
1 | Introduction
1.1 | Document Overview
1.2 | User Needs
2 | User Story of “Hybrid Parking Control System (HPCS)”
2.1 | US01 – [Driver / User] Entry Vehicle Detection and Plate Capture
2.2 | US02 – [Student Card Holder / Visitor] Prepaid Entry Payment
2.3 | US03 – [Driver / User] Parking Card/Ticket Issuance
2.4 | US04 – [Driver / User] Safe Entry Barrier Operation
2.5 | US05 – [Faculty / Staff Whitelist User] Free-Access Entry via Whitelist
2.6 | US06 – [Driver / User] Exit Validation and Plate Re-Match
2.7 | US07 – [Driver / User] Gate Guidance through LED and Voice
2.8 | US08 – [Admin] Secure Administrator Authentication and Authorization
2.9 | US09 – [Admin] Whitelist and Access Policy Management
2.10 | US10 – [Admin / Security Operator] Transaction and Gate Event Logging
2.11 | US11 – [Admin / Security Operator] Operational Dashboard and Reports
2.12 | US12 – [Security Staff / Operational Supervisor] Device Status Monitoring
2.13 | US13 – [System] Encrypted Storage and Protected Access
2.14 | US14 – [System] Performance Compliance at Gate
2.15 | US15 – [System] Continuous Operation and LPR Accuracy
2.16 | US16 – [System] Deny Exit on Invalid or Mismatched Data
2.17 | US17 – [System] Multi-Gate Scalability
2.18 | US18 – [Developer] Hardware Integration Framework
2.19 | US19 – [Developer] Containerized Environment and Deployment
2.20 | US20 – [System] Student ID Data Source Integration

Table No. | Title
Table 1 | US01 – [Driver / User] Entry Vehicle Detection and Plate Capture
Table 2 | US02 – [Student Card Holder / Visitor] Prepaid Entry Payment
Table 3 | US03 – [Driver / User] Parking Card/Ticket Issuance
Table 4 | US04 – [Driver / User] Safe Entry Barrier Operation
Table 5 | US05 – [Faculty / Staff Whitelist User] Free-Access Entry via Whitelist
Table 6 | US06 – [Driver / User] Exit Validation and Plate Re-Match
Table 7 | US07 – [Driver / User] Gate Guidance through LED and Voice
Table 8 | US08 – [Admin] Secure Administrator Authentication and Authorization
Table 9 | US09 – [Admin] Whitelist and Access Policy Management
Table 10 | US10 – [Admin / Security Operator] Transaction and Gate Event Logging
Table 11 | US11 – [Admin / Security Operator] Operational Dashboard and Reports
Table 12 | US12 – [Security Staff / Operational Supervisor] Device Status Monitoring
Table 13 | US13 – [System] Encrypted Storage and Protected Access
Table 14 | US14 – [System] Performance Compliance at Gate
Table 15 | US15 – [System] Continuous Operation and LPR Accuracy
Table 16 | US16 – [System] Deny Exit on Invalid or Mismatched Data
Table 17 | US17 – [System] Multi-Gate Scalability
Table 18 | US18 – [Developer] Hardware Integration Framework
Table 19 | US19 – [Developer] Containerized Environment and Deployment
Table 20 | US20 – [System] Student ID Data Source Integration

Story ID | US01
Backlog Reference | PB01
Project | HPCS
Priority | High
Actor | Driver / User
As a/an | Driver / User
I want to | the entry gate to detect my vehicle and capture my license plate automatically
So that | the system can begin my parking transaction without manual recording

Story ID | US02
Backlog Reference | PB02
Project | HPCS
Priority | High
Actor | Student Card Holder / Visitor
As a/an | Student Card Holder / Visitor
I want to | to complete payment at the entry gate using a student ID card (contactless) or cash
So that | I can pay before entering and avoid manual collection at the exit gate

Story ID | US03
Backlog Reference | PB03
Project | HPCS
Priority | High
Actor | Driver / User
As a/an | Driver / User
I want to | to receive a parking card or ticket after valid payment or whitelist verification
So that | my entry transaction is linked to a credential that can be checked at exit

Story ID | US04
Backlog Reference | PB04
Project | HPCS
Priority | High
Actor | Driver / User
As a/an | Driver / User
I want to | the entry barrier to open only after valid authorization and close safely after my vehicle passes
So that | the gate remains secure and traffic flow stays orderly

Story ID | US05
Backlog Reference | PB05
Project | HPCS
Priority | Medium
Actor | Faculty / Staff Whitelist User
As a/an | Faculty / Staff Whitelist User
I want to | the gate to recognize my authorized free-access status
So that | I can enter without payment when university policy allows it

Story ID | US06
Backlog Reference | PB06
Project | HPCS
Priority | High
Actor | Driver / User
As a/an | Driver / User
I want to | to present my parking card or ticket and have my exit plate matched to the entry record
So that | I can leave without additional payment while the system verifies that the right vehicle is exiting

Story ID | US07
Backlog Reference | PB07
Project | HPCS
Priority | Medium
Actor | Driver / User
As a/an | Driver / User
I want to | clear LED instructions and optional voice prompts while I use the gate
So that | I can complete the parking flow correctly without relying on staff for routine guidance

Story ID | US08
Backlog Reference | PB08
Project | HPCS
Priority | High
Actor | Admin
As a/an | Admin
I want to | to authenticate securely and access only the functions assigned to my role
So that | administrative operations and protected parking data remain secure

Story ID | US09
Backlog Reference | PB09
Project | HPCS
Priority | Medium
Actor | Admin
As a/an | Admin
I want to | to maintain whitelist entries and their free-access policy status
So that | the gate applies the current authorization rules for eligible users

Story ID | US10
Backlog Reference | PB10
Project | HPCS
Priority | High
Actor | Admin / Security Operator
As a/an | Admin / Security Operator
I want to | all gate and payment events to be recorded in a complete log
So that | operations can be audited and exceptions can be investigated later

Story ID | US11
Backlog Reference | PB11
Project | HPCS
Priority | Medium
Actor | Admin / Security Operator
As a/an | Admin / Security Operator
I want to | a dashboard showing operational indicators and reports
So that | I can monitor traffic, revenue, occupancy, and recognition performance

Story ID | US12
Backlog Reference | PB12
Project | HPCS
Priority | Medium
Actor | Security Staff / Operational Supervisor
As a/an | Security Staff / Operational Supervisor
I want to | to monitor the condition of the gate devices used by HPCS
So that | I can respond quickly when hardware or communication problems occur

Story ID | US13
Backlog Reference | PB13
Project | HPCS
Priority | High
Actor | System
As a/an | System
I want to | to encrypt protected transaction data and restrict access to stored license plate information
So that | sensitive payment and parking records remain secure

Story ID | US14
Backlog Reference | PB14
Project | HPCS
Priority | High
Actor | System
As a/an | System
I want to | the main gate flows to complete within the performance targets defined for HPCS
So that | parking queues stay low and the user experience remains efficient

Story ID | US15
Backlog Reference | PB15
Project | HPCS
Priority | Medium
Actor | System
As a/an | System
I want to | to remain available for continuous operation and recognize plates accurately in controlled conditions
So that | the campus can rely on HPCS during daily parking activity

Story ID | US16
Backlog Reference | PB16
Project | HPCS
Priority | High
Actor | System
As a/an | System
I want to | to keep the exit barrier closed when validation data is invalid or does not match
So that | unauthorized vehicle release is prevented

Story ID | US17
Backlog Reference | PB17
Project | HPCS
Priority | Low
Actor | System
As a/an | System
I want to | the architecture to support additional entry and exit gates without major redesign
So that | the university can expand the parking solution when needed

Story ID | US18
Backlog Reference | PB18
Project | HPCS
Priority | High
Actor | Developer
As a/an | Developer
I want to | a reliable integration framework between backend services and parking hardware
So that | end-to-end gate automation works consistently in testing and deployment

Story ID | US19
Backlog Reference | PB19
Project | HPCS
Priority | Medium
Actor | Developer
As a/an | Developer
I want to | the supported services to run in a stable, containerized environment
So that | the team can build, test, and deploy HPCS more consistently

Story ID | US20
Backlog Reference | PB20
Project | HPCS
Priority | Medium
Actor | System
As a/an | System
I want to | to validate contactless student card data against the university source used for card verification
So that | student-card-based payment or authentication can be processed correctly at the gate

