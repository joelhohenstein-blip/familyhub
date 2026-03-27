#!/bin/bash

################################################################################
# FamilyHub Compliance Verification Script
# 
# Purpose: Automated monthly compliance monitoring and verification
# Usage: ./COMPLIANCE_VERIFICATION_SCRIPT.sh [--full|--quick|--report]
# 
# Modes:
#   --quick   : Fast check (5 min) - document existence and basic structure
#   --full    : Complete check (15 min) - includes content validation
#   --report  : Generate compliance report (HTML output)
#   (default) : Standard check (10 min) - balanced verification
#
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="${SCRIPT_DIR}/compliance-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/compliance_report_${TIMESTAMP}.txt"
HTML_REPORT="${REPORT_DIR}/compliance_report_${TIMESTAMP}.html"
LOG_FILE="${REPORT_DIR}/compliance_log_${TIMESTAMP}.log"

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Create report directory
mkdir -p "${REPORT_DIR}"

################################################################################
# Utility Functions
################################################################################

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

pass() {
    echo -e "${GREEN}✅ PASS${NC}: $*" | tee -a "${LOG_FILE}"
    ((CHECKS_PASSED++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $*" | tee -a "${LOG_FILE}"
    ((CHECKS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $*" | tee -a "${LOG_FILE}"
    ((CHECKS_WARNING++))
}

info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $*" | tee -a "${LOG_FILE}"
}

check_file_exists() {
    local file="$1"
    local description="$2"
    
    if [ -f "${SCRIPT_DIR}/${file}" ]; then
        pass "${description} exists"
        return 0
    else
        fail "${description} missing: ${file}"
        return 1
    fi
}

check_file_contains() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    
    if [ ! -f "${SCRIPT_DIR}/${file}" ]; then
        fail "${description} - file not found: ${file}"
        return 1
    fi
    
    if grep -q "${pattern}" "${SCRIPT_DIR}/${file}"; then
        pass "${description}"
        return 0
    else
        fail "${description} - pattern not found in ${file}"
        return 1
    fi
}

check_file_size() {
    local file="$1"
    local min_size="$2"
    local description="$3"
    
    if [ ! -f "${SCRIPT_DIR}/${file}" ]; then
        fail "${description} - file not found: ${file}"
        return 1
    fi
    
    local size=$(wc -c < "${SCRIPT_DIR}/${file}")
    if [ "${size}" -ge "${min_size}" ]; then
        pass "${description} (${size} bytes)"
        return 0
    else
        fail "${description} - file too small: ${size} bytes (minimum: ${min_size})"
        return 1
    fi
}

################################################################################
# Compliance Checks
################################################################################

check_legal_documents() {
    log ""
    log "=== LEGAL DOCUMENTS VERIFICATION ==="
    
    check_file_exists "PRIVACY_POLICY.md" "Privacy Policy"
    check_file_contains "PRIVACY_POLICY.md" "data collection" "Privacy Policy contains data collection section"
    check_file_contains "PRIVACY_POLICY.md" "user rights" "Privacy Policy contains user rights section"
    check_file_contains "PRIVACY_POLICY.md" "retention" "Privacy Policy contains retention policy"
    
    check_file_exists "TERMS_OF_SERVICE.md" "Terms of Service"
    check_file_contains "TERMS_OF_SERVICE.md" "liability" "Terms of Service contains liability section"
    check_file_contains "TERMS_OF_SERVICE.md" "user obligations" "Terms of Service contains user obligations"
    
    check_file_exists "COOKIE_POLICY.md" "Cookie Policy"
    check_file_contains "COOKIE_POLICY.md" "cookie" "Cookie Policy contains cookie definitions"
    check_file_contains "COOKIE_POLICY.md" "consent" "Cookie Policy contains consent mechanism"
    
    check_file_exists "DATA_PROCESSING_AGREEMENT.md" "Data Processing Agreement"
    check_file_contains "DATA_PROCESSING_AGREEMENT.md" "processor" "DPA contains processor responsibilities"
    check_file_contains "DATA_PROCESSING_AGREEMENT.md" "data subject" "DPA contains data subject rights"
}

check_security_documentation() {
    log ""
    log "=== SECURITY DOCUMENTATION VERIFICATION ==="
    
    check_file_exists "SECURITY_AUDIT_REPORT.md" "Security Audit Report"
    check_file_contains "SECURITY_AUDIT_REPORT.md" "OWASP" "Security Audit covers OWASP"
    check_file_contains "SECURITY_AUDIT_REPORT.md" "encryption" "Security Audit covers encryption"
    
    check_file_exists "SECURITY_IMPLEMENTATION_GUIDE.md" "Security Implementation Guide"
    check_file_contains "SECURITY_IMPLEMENTATION_GUIDE.md" "authentication" "Security Guide covers authentication"
    check_file_contains "SECURITY_IMPLEMENTATION_GUIDE.md" "authorization" "Security Guide covers authorization"
}

check_data_protection() {
    log ""
    log "=== DATA PROTECTION VERIFICATION ==="
    
    check_file_exists "DATA_PROTECTION_PRIVACY_IMPLEMENTATION_GUIDE.md" "Data Protection Guide"
    check_file_contains "DATA_PROTECTION_PRIVACY_IMPLEMENTATION_GUIDE.md" "GDPR" "Data Protection Guide covers GDPR"
    check_file_contains "DATA_PROTECTION_PRIVACY_IMPLEMENTATION_GUIDE.md" "data minimization" "Data Protection Guide covers data minimization"
    check_file_contains "DATA_PROTECTION_PRIVACY_IMPLEMENTATION_GUIDE.md" "retention" "Data Protection Guide covers retention"
}

check_documentation_index() {
    log ""
    log "=== DOCUMENTATION INDEX VERIFICATION ==="
    
    check_file_exists "LEGAL_DOCUMENTS_INDEX.md" "Legal Documents Index"
    check_file_contains "LEGAL_DOCUMENTS_INDEX.md" "PRIVACY_POLICY" "Index references Privacy Policy"
    check_file_contains "LEGAL_DOCUMENTS_INDEX.md" "TERMS_OF_SERVICE" "Index references Terms of Service"
    check_file_contains "LEGAL_DOCUMENTS_INDEX.md" "COOKIE_POLICY" "Index references Cookie Policy"
}

check_code_compliance() {
    log ""
    log "=== CODE COMPLIANCE VERIFICATION ==="
    
    # Check for TypeScript configuration
    if [ -f "${SCRIPT_DIR}/tsconfig.json" ]; then
        pass "TypeScript configuration exists"
        if grep -q '"strict": true' "${SCRIPT_DIR}/tsconfig.json"; then
            pass "Strict TypeScript mode enabled"
        else
            warn "Strict TypeScript mode not enabled"
        fi
    else
        fail "TypeScript configuration missing"
    fi
    
    # Check for Vite configuration
    if [ -f "${SCRIPT_DIR}/vite.config.ts" ]; then
        pass "Vite configuration exists"
    else
        fail "Vite configuration missing"
    fi
    
    # Check for app routes
    if [ -f "${SCRIPT_DIR}/app/routes.ts" ]; then
        pass "Routes configuration exists"
    else
        warn "Routes configuration not found"
    fi
}

check_dependency_security() {
    log ""
    log "=== DEPENDENCY SECURITY VERIFICATION ==="
    
    if [ -f "${SCRIPT_DIR}/package.json" ]; then
        pass "package.json exists"
        
        # Check for common security packages
        if grep -q "helmet" "${SCRIPT_DIR}/package.json"; then
            pass "Helmet security package found"
        else
            warn "Helmet security package not found"
        fi
        
        if grep -q "zod\|joi\|yup" "${SCRIPT_DIR}/package.json"; then
            pass "Input validation library found"
        else
            warn "Input validation library not found"
        fi
    else
        fail "package.json not found"
    fi
}

check_environment_security() {
    log ""
    log "=== ENVIRONMENT SECURITY VERIFICATION ==="
    
    if [ -f "${SCRIPT_DIR}/.env.example" ]; then
        pass ".env.example exists"
    else
        warn ".env.example not found - consider creating one"
    fi
    
    if [ -f "${SCRIPT_DIR}/.gitignore" ]; then
        pass ".gitignore exists"
        if grep -q "\.env" "${SCRIPT_DIR}/.gitignore"; then
            pass ".env files are gitignored"
        else
            fail ".env files are NOT gitignored - security risk!"
        fi
    else
        warn ".gitignore not found"
    fi
}

check_file_permissions() {
    log ""
    log "=== FILE PERMISSIONS VERIFICATION ==="
    
    # Check that sensitive files are not world-readable
    local sensitive_files=(
        ".env"
        ".env.local"
        "secrets.json"
    )
    
    for file in "${sensitive_files[@]}"; do
        if [ -f "${SCRIPT_DIR}/${file}" ]; then
            local perms=$(stat -c %a "${SCRIPT_DIR}/${file}" 2>/dev/null || stat -f %A "${SCRIPT_DIR}/${file}" 2>/dev/null || echo "unknown")
            if [[ "${perms}" == *"4"* ]] || [[ "${perms}" == *"2"* ]]; then
                fail "${file} has overly permissive permissions: ${perms}"
            else
                pass "${file} has secure permissions: ${perms}"
            fi
        fi
    done
}

check_documentation_completeness() {
    log ""
    log "=== DOCUMENTATION COMPLETENESS VERIFICATION ==="
    
    local required_docs=(
        "PRIVACY_POLICY.md:1000"
        "TERMS_OF_SERVICE.md:1000"
        "COOKIE_POLICY.md:500"
        "DATA_PROCESSING_AGREEMENT.md:1500"
        "SECURITY_AUDIT_REPORT.md:500"
        "SECURITY_IMPLEMENTATION_GUIDE.md:1000"
        "DATA_PROTECTION_PRIVACY_IMPLEMENTATION_GUIDE.md:1000"
    )
    
    for doc_spec in "${required_docs[@]}"; do
        IFS=':' read -r doc min_size <<< "${doc_spec}"
        check_file_size "${doc}" "${min_size}" "${doc} is sufficiently detailed"
    done
}

################################################################################
# Report Generation
################################################################################

generate_text_report() {
    log ""
    log "=== GENERATING COMPLIANCE REPORT ==="
    
    {
        echo "================================================================================"
        echo "FamilyHub Compliance Verification Report"
        echo "Generated: $(date)"
        echo "================================================================================"
        echo ""
        echo "SUMMARY"
        echo "-------"
        echo "Checks Passed:  ${CHECKS_PASSED}"
        echo "Checks Failed:  ${CHECKS_FAILED}"
        echo "Warnings:       ${CHECKS_WARNING}"
        echo "Total Checks:   $((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))"
        echo ""
        
        if [ ${CHECKS_FAILED} -eq 0 ]; then
            echo "Status: ✅ COMPLIANT"
        else
            echo "Status: ❌ NON-COMPLIANT - ${CHECKS_FAILED} issues require attention"
        fi
        
        echo ""
        echo "================================================================================"
        echo "NEXT STEPS"
        echo "================================================================================"
        echo ""
        
        if [ ${CHECKS_FAILED} -gt 0 ]; then
            echo "1. Review failed checks in the log file: ${LOG_FILE}"
            echo "2. Address each failure according to the compliance checklist"
            echo "3. Re-run this script to verify fixes"
            echo ""
        fi
        
        echo "Recommended Actions:"
        echo "- Review COMPLIANCE_CHECKLIST.md for detailed requirements"
        echo "- Schedule quarterly manual compliance reviews"
        echo "- Run this script monthly for ongoing monitoring"
        echo "- Keep all legal documents updated with current practices"
        echo ""
        
        echo "================================================================================"
        echo "DETAILED LOG"
        echo "================================================================================"
        cat "${LOG_FILE}"
        
    } > "${REPORT_FILE}"
    
    pass "Text report generated: ${REPORT_FILE}"
}

generate_html_report() {
    log ""
    log "=== GENERATING HTML REPORT ==="
    
    local status_color="green"
    local status_text="COMPLIANT"
    
    if [ ${CHECKS_FAILED} -gt 0 ]; then
        status_color="red"
        status_text="NON-COMPLIANT"
    fi
    
    {
        cat << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FamilyHub Compliance Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .timestamp { opacity: 0.9; font-size: 0.9em; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 { color: #667eea; margin-bottom: 10px; }
        .summary-card .number {
            font-size: 2.5em;
            font-weight: bold;
            color: #333;
        }
        .status {
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            font-weight: bold;
            font-size: 1.2em;
        }
        .status.compliant {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.non-compliant {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .section {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section h2 {
            color: #667eea;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }
        .checklist {
            list-style: none;
        }
        .checklist li {
            padding: 10px;
            margin: 5px 0;
            border-left: 4px solid #ddd;
            background: #fafafa;
        }
        .checklist li.pass {
            border-left-color: #28a745;
            background: #f0f8f5;
        }
        .checklist li.fail {
            border-left-color: #dc3545;
            background: #fdf5f5;
        }
        .checklist li.warn {
            border-left-color: #ffc107;
            background: #fffbf0;
        }
        .icon {
            margin-right: 10px;
            font-weight: bold;
        }
        footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 0.9em;
        }
        .next-steps {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        .next-steps h3 { color: #1976D2; margin-bottom: 10px; }
        .next-steps ol { margin-left: 20px; }
        .next-steps li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔒 FamilyHub Compliance Report</h1>
            <div class="timestamp">Generated: <span id="timestamp"></span></div>
        </header>
        
        <div class="summary">
            <div class="summary-card">
                <h3>✅ Passed</h3>
                <div class="number" id="passed">0</div>
            </div>
            <div class="summary-card">
                <h3>❌ Failed</h3>
                <div class="number" id="failed">0</div>
            </div>
            <div class="summary-card">
                <h3>⚠️ Warnings</h3>
                <div class="number" id="warnings">0</div>
            </div>
            <div class="summary-card">
                <h3>📊 Total</h3>
                <div class="number" id="total">0</div>
            </div>
        </div>
        
        <div class="status" id="status"></div>
        
        <div class="section next-steps">
            <h3>📋 Next Steps</h3>
            <ol>
                <li>Review the detailed results below</li>
                <li>Address any failed checks immediately</li>
                <li>Investigate warnings and plan remediation</li>
                <li>Schedule quarterly manual compliance reviews</li>
                <li>Run this script monthly for ongoing monitoring</li>
            </ol>
        </div>
        
        <div class="section">
            <h2>📋 Compliance Checklist Results</h2>
            <ul class="checklist" id="checklist"></ul>
        </div>
        
        <footer>
            <p>FamilyHub Compliance Verification System</p>
            <p>For detailed information, see COMPLIANCE_CHECKLIST.md</p>
        </footer>
    </div>
    
    <script>
        document.getElementById('timestamp').textContent = new Date().toLocaleString();
        document.getElementById('passed').textContent = PASSED_COUNT;
        document.getElementById('failed').textContent = FAILED_COUNT;
        document.getElementById('warnings').textContent = WARNINGS_COUNT;
        document.getElementById('total').textContent = TOTAL_COUNT;
        
        const statusEl = document.getElementById('status');
        if (FAILED_COUNT === 0) {
            statusEl.className = 'status compliant';
            statusEl.textContent = '✅ COMPLIANT - All checks passed';
        } else {
            statusEl.className = 'status non-compliant';
            statusEl.textContent = `❌ NON-COMPLIANT - ${FAILED_COUNT} issues require attention`;
        }
    </script>
</body>
</html>
EOF
    } > "${HTML_REPORT}"
    
    pass "HTML report generated: ${HTML_REPORT}"
}

################################################################################
# Main Execution
################################################################################

main() {
    local mode="${1:-standard}"
    
    log "Starting FamilyHub Compliance Verification"
    log "Mode: ${mode}"
    log "Timestamp: $(date)"
    
    # Run checks based on mode
    case "${mode}" in
        --quick)
            check_legal_documents
            check_documentation_index
            ;;
        --full)
            check_legal_documents
            check_security_documentation
            check_data_protection
            check_documentation_index
            check_code_compliance
            check_dependency_security
            check_environment_security
            check_file_permissions
            check_documentation_completeness
            ;;
        --report)
            check_legal_documents
            check_security_documentation
            check_data_protection
            check_documentation_index
            check_code_compliance
            check_dependency_security
            check_environment_security
            check_file_permissions
            check_documentation_completeness
            generate_text_report
            generate_html_report
            ;;
        *)
            # Standard mode (default)
            check_legal_documents
            check_security_documentation
            check_data_protection
            check_documentation_index
            check_code_compliance
            check_dependency_security
            check_environment_security
            ;;
    esac
    
    # Generate reports
    if [ "${mode}" != "--quick" ]; then
        generate_text_report
    fi
    
    # Print summary
    log ""
    log "=== VERIFICATION COMPLETE ==="
    log "Passed:  ${CHECKS_PASSED}"
    log "Failed:  ${CHECKS_FAILED}"
    log "Warnings: ${CHECKS_WARNING}"
    log "Total:   $((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))"
    log ""
    
    if [ ${CHECKS_FAILED} -eq 0 ]; then
        log "✅ COMPLIANCE STATUS: PASS"
        return 0
    else
        log "❌ COMPLIANCE STATUS: FAIL - ${CHECKS_FAILED} issues found"
        return 1
    fi
}

# Run main function
main "$@"
