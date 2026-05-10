International School
Capstone Project 1
CMU-SE 450 – C1SE.82
Product Backlog
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
DOCUMENT APPROVALS
The following signatures are required for approval of this document.
DOCUMENT NAME
REVISION HISTORY
TABLE OF CONTENTS
TABLE OF TABLES
1. Introduction
The HPCS product backlog is a prioritized list of features and quality attributes derived from the approved project proposal. It translates the project scope, functional requirements, non-functional requirements, operating constraints, and stakeholder needs into development-ready backlog items for the Hybrid Parking Control System.
1.1 Purpose
• Provide a clear and prioritized backlog for the Hybrid Parking Control System (HPCS).
• Keep development aligned with the approved project objectives: pay-before-entry processing, license plate recognition, automated barrier control, and supervised operation when needed.
• Represent both functional scope and major non-functional requirements such as performance, usability, security, reliability, and scalability.
• Preserve traceability from proposal-based requirements to implementable backlog items for Sprint planning and review.
1.2 Scope
This backlog covers the approved HPCS scope for a university parking context. It includes user and vehicle authentication, automated barrier control, prepaid entry payment, license plate recording and matching, parking card/ticket issuance, whitelist-based free access, transaction logging, administrative monitoring, and supporting quality requirements.
The current version excludes remote mobile booking, advanced long-term AI vehicle tracking, and complex financial accounting for external parking lots. No unrelated sample-domain features are included in this document.
1.3 References
Table 1. References
2. Product Backlog
Priorities are set from 1 to 3, where 1 = Must Have / critical MVP, 2 = Should Have / important, and 3 = Could Have / nice to have. If a backlog item depends on another item, it does not carry a lower importance than its prerequisite.
Table 2. Product Backlog Specification (Driver / User)
Table 3. Product Backlog Specification (Admin / Security Operator)
Table 4. Product Backlog Specification (System)
Table 5. Product Backlog Specification (Development / Infrastructure)
3. Constraints
Table 6. Constraints
4. Stakeholders and User Descriptions Summary
Table 7. Stakeholders and User Descriptions Summary


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

Name | Student ID | Role | Signature | Date
Ninh, Vu Ha | 28211105939 | Scrum Master |  | 
Hieu, Le Minh | 28219045377 | Team Member |  | 
Khang, Nguyen Dinh Vinh | 28211141406 | Project Leader |  | 
Dung, Le Trung | 28210239671 | Team Member |  | 
Nhat, Le Van | 28218044202 | Team Member |  | 

Document Title | Product Backlog Document
Author(s) | HPCS Project Team
Role | Project Team
Date | March 29th, 2026
File name | C1SE.82_ProductBacklog_HPCS_ver1.0.docx

Version | Person(s) | Date | Description
1.0 | HPCS Project Team | 29-Mar-2026 | Initial release of the HPCS Product Backlog document.

Section | Title
1 | Introduction
1.1 | Purpose
1.2 | Scope
1.3 | References
2 | Product Backlog
3 | Constraints
4 | Stakeholders and User Descriptions Summary

Table No. | Title
Table 1 | References
Table 2 | Product Backlog Specification (Driver / User)
Table 3 | Product Backlog Specification (Admin / Security Operator)
Table 4 | Product Backlog Specification (System)
Table 5 | Product Backlog Specification (Development / Infrastructure)
Table 6 | Constraints
Table 7 | Stakeholders and User Descriptions Summary

No. | Reference | Purpose
1 | C1SE.08 Project Proposal Version 1.0, dated February 24th, 2026 | Primary source of truth for HPCS scope, requirements, stakeholders, schedule, and terminology.
2 | C1SE.82 Product Backlog sample document | Structure and formatting reference for the Product Backlog document only.
3 | C1SE.82 User Story sample document | Structure and formatting reference for the User Story document only.

ID | Theme | As a/an | I want to | So that | Priority
PB01 | Entry Plate Capture | Driver / User | have my vehicle detected and my license plate captured at the entry gate | the system can start entry validation automatically and reduce manual processing | 1
PB02 | Prepaid Entry Payment | Student Card Holder / Visitor | pay at the entry gate using a student ID card (contactless) or cash | access is granted only after payment is confirmed in the pay-before-entry model | 1
PB03 | Parking Card/Ticket Issuance | Driver / User | receive a parking card or ticket after valid payment or whitelist verification | my entry transaction is linked to a physical credential for later exit validation | 1
PB04 | Entry Barrier Control | Driver / User | have the barrier open only after valid authorization and close safely after passage | unauthorized vehicles are blocked and entry remains orderly | 1
PB05 | Whitelist Free Access | Faculty / Staff Whitelist User | be recognized for free-access entry when my vehicle or credential is authorized | I can enter without payment when university policy allows it | 2
PB06 | Exit Validation and Plate Re-Match | Driver / User | present my parking card or ticket and have my exit plate checked against the entry record | I can leave without additional payment while the system prevents misuse | 1
PB07 | Gate Guidance | Driver / User | receive clear LED instructions and optional voice guidance at the gate | I can complete the entry and exit flow with minimal confusion or delay | 2

ID | Theme | As a/an | I want to | So that | Priority
PB08 | Administrator Authentication | Admin | sign in securely and access only the functions allowed for my role | management features and sensitive parking data remain protected | 1
PB09 | Whitelist and Access Policy Management | Admin | maintain whitelist records and free-access rules for eligible users | gate decisions follow current university access policy | 2
PB10 | Transaction and Gate Event Logging | Admin / Security Operator | view complete records of plate captures, timestamps, gate events, and payment outcomes | operations remain traceable and auditable | 1
PB11 | Administrative Dashboard and Reports | Admin / Security Operator | see total vehicles, revenue statistics, occupancy status, and recognition accuracy | I can monitor operations and make data-driven decisions | 2
PB12 | Device Status Monitoring | Security Operator | monitor the status of cameras, barriers, readers, dispensers, speakers, and cash modules | I can respond quickly when hardware faults or exceptions occur | 2

ID | Theme | As a/an | I want to | So that | Priority
PB13 | Encrypted and Protected Data Storage | System | encrypt transaction and payment data and restrict access to stored license plate information | sensitive operational data remains secure | 1
PB14 | Performance Compliance | System | complete payment confirmation and ticket issuance within 5 seconds and exit verification within 3 seconds | vehicle queues are minimized at both gates | 1
PB15 | Reliability and LPR Accuracy | System | support continuous 24/7 operation and maintain 90–95% recognition accuracy in controlled conditions | the parking process remains dependable in daily use | 2
PB16 | Invalid or Mismatched Exit Handling | System | keep the barrier closed when the presented credential, transaction, or license plate does not match | unauthorized exit is prevented and exceptions can be reviewed | 1
PB17 | Multi-Gate Scalability | System | support expansion to multiple entry and exit gates without major redesign | the campus can scale the solution over time | 3

ID | Theme | As a/an | I want to | So that | Priority
PB18 | Hardware Integration Framework | Development Team | integrate the backend with the camera, barrier controller, card reader, dispenser, and cash module | automated gate workflows operate reliably end to end | 1
PB19 | Containerized Environment and Deployment | Development Team | build and deploy supported services using Docker and stable development tooling | the system is easier to set up, test, and deploy consistently | 2
PB20 | Student Card Data Integration | Development Team | connect to the university student ID data source for contactless validation | card-based payment and authentication can be processed correctly | 2

Constraint | Description
Development Timeline | The project is planned from February 24th, 2026 to June 20th, 2026, so delivery must focus on core gate automation, payment, ticketing, and exit validation first.
Team Capacity | The delivery team has five members, requiring disciplined role allocation across frontend, backend, database, hardware integration, testing, and documentation.
Hardware Integration | HPCS depends on cameras, barrier gates, LED indicators, speakers, card readers, ticket/card dispensers, and cash modules working reliably with the backend.
Budget | The prototype budget is limited, so the solution must prioritize low-cost components, staged hardware procurement, or software-first simulation when needed.
Environment and Lighting | License plate recognition quality depends on controlled lighting, a proper stopping position, and clean, unobstructed license plates.
Network Connectivity | Entry and exit gates require stable connectivity to synchronize transactions, validation status, and reporting data.
External Dependency | Contactless student-card validation depends on access to the university student ID data source or a compatible integration endpoint.
Technology Constraints | The implementation is limited to the project stack proposed for HPCS: React.js or Flutter, Python backend services, OpenCV plus Tesseract or YOLO, Arduino or Raspberry Pi, MySQL or PostgreSQL, and Docker.

Name | Description | Role
University Management | Owns parking policy, service goals, and operational reporting expectations for campus parking. | System owner / decision maker
System Administrators | Manage authentication, whitelist policy, dashboard access, reports, and protected operational data. | Administrative users
Security Team / Operational Supervisors | Oversee gate activity, monitor devices, review exceptions, and intervene when supervised control is required. | Operational supervisors
Students | Use the parking entry and exit flow, pay by student card or cash when applicable, and expect fast processing at the gate. | Primary end users
Faculty and Staff | May receive whitelist-based free access and still require reliable license plate recognition and transaction recording. | Privileged end users
Visitors | Need a simple pay-before-entry process, clear kiosk guidance, and reliable exit validation. | External end users
IT Department | Supports infrastructure, integration, deployment, security controls, and service continuity. | Technical stakeholder
Finance Department | Uses revenue and transaction information for oversight and reconciliation. | Reporting stakeholder
HPCS Project Team | Designs, builds, tests, documents, and deploys the HPCS prototype within the capstone schedule. | Delivery team

