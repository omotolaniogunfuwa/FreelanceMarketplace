# Decentralized Freelance Marketplace

A blockchain-based freelance platform built on Stacks that enables direct interaction between freelancers and clients without intermediaries. The platform uses smart contracts to handle job postings, bidding, escrow payments, and dispute resolution.

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Smart Contract Architecture](#smart-contract-architecture)
- [Testing](#testing)
- [Usage Guide](#usage-guide)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## Features

### Core Functionality
- **Job Posting System**
    - Create detailed job listings
    - Set milestone-based budgets
    - Automatic escrow lock on posting

- **Bidding System**
    - Submit detailed proposals
    - View and manage bids
    - Prevent duplicate bidding

- **Milestone-Based Payments**
    - Automatic escrow management
    - Milestone verification
    - Secure fund release

- **Dispute Resolution**
    - Community-based voting system
    - Transparent resolution process
    - Fair voting mechanism

- **Rating System**
    - User reputation tracking
    - Average rating calculation
    - Historical performance metrics

## Technology Stack

- **Smart Contract**: Clarity
- **Testing Framework**: Vitest
- **Blockchain**: Stacks
- **Client Libraries**: @stacks/transactions

## Getting Started

### Prerequisites
```bash
# Install Node.js and npm
node -v  # Should be 14.x or higher
npm -v   # Should be 6.x or higher

# Install dependencies
npm install
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/freelance-marketplace.git
cd freelance-marketplace
```

2. Install dependencies:
```bash
npm install
```

3. Set up local Stacks blockchain:
```bash
# Install Stacks blockchain
npm install -g @stacks/cli

# Start local blockchain
stacks-node start
```

### Contract Deployment

1. Configure your deployment settings in `settings.json`

2. Deploy the contract:
```bash
clarinet contract deploy freelance-marketplace
```

## Smart Contract Architecture

### Data Maps
- `jobs`: Stores job postings and their details
- `bids`: Manages freelancer proposals
- `user-ratings`: Tracks user reputation
- `disputes`: Handles dispute cases
- `escrow`: Manages locked funds

### Key Functions

#### Job Management
```clarity
(define-public (post-job (title (string-utf8 100)) 
                        (description (string-utf8 500)) 
                        (budget uint) 
                        (milestones (list 10 uint))))

(define-public (place-bid (job-id uint) 
                         (amount uint) 
                         (proposal (string-utf8 500))))
```

#### Milestone System
```clarity
(define-public (complete-milestone (job-id uint)))
```

#### Dispute Resolution
```clarity
(define-public (raise-dispute (job-id uint) 
                             (reason (string-utf8 500))))

(define-public (vote-on-dispute (job-id uint) 
                               (vote-release bool)))
```

## Testing

Run the test suite:
```bash
npm test
```

The tests cover:
- Job posting functionality
- Bidding system
- Milestone completion
- Payment processing
- Dispute resolution
- Rating system

### Test Coverage
```bash
npm run test:coverage
```

## Usage Guide

### For Clients

1. **Posting a Job**
```clarity
;; Example job posting
(contract-call? .freelance-marketplace post-job 
    "Web Development"
    "Build a responsive website"
    u1000
    (list u500 u500))
```

2. **Accepting a Bid**
```clarity
(contract-call? .freelance-marketplace accept-bid 
    u1 
    'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```

### For Freelancers

1. **Placing a Bid**
```clarity
(contract-call? .freelance-marketplace place-bid 
    u1 
    u900 
    "Detailed proposal with timeline")
```

2. **Completing Milestones**
```clarity
;; Freelancer marks milestone as complete
(contract-call? .freelance-marketplace complete-milestone u1)
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow Clarity best practices
- Add tests for new features
- Update documentation
- Follow the existing code style

## Security

### Smart Contract Security

- Escrow system for secure payments
- Authorization checks on all sensitive functions
- Status validation for state transitions
- Error handling for invalid operations

### Best Practices

- Only interact with verified contract addresses
- Always verify transaction status
- Keep private keys secure
- Monitor for suspicious activities

### Known Limitations

- Maximum 10 milestones per job
- Rating values must be between 1-5
- Dispute resolution requires minimum voter participation

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers:
- Email: support@freelancemarketplace.com
- Discord: [Join our community](https://discord.gg/freelancemarketplace)

## Roadmap

### Q2 2024
- [ ] Multi-signature escrow
- [ ] Enhanced dispute resolution
- [ ] Reputation token system

### Q3 2024
- [ ] Cross-chain integration
- [ ] Advanced milestone tracking
- [ ] Automated payment scheduling

### Q4 2024
- [ ] DAO governance implementation
- [ ] Freelancer skill verification
- [ ] Decentralized arbitration system
