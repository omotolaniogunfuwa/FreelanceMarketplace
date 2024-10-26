;; Freelance Marketplace Contract
;; Handles job postings, bidding, escrow, milestones, and dispute resolution

;; Data Maps and Variables
(define-map jobs
    { job-id: uint }
    {
        client: principal,
        title: (string-utf8 100),
        description: (string-utf8 500),
        budget: uint,
        status: (string-utf8 20),
        freelancer: (optional principal),
        milestones: (list 10 uint),
        current-milestone: uint
    }
)

(define-map bids
    { job-id: uint, bidder: principal }
    {
        amount: uint,
        proposal: (string-utf8 500),
        status: (string-utf8 20)
    }
)

(define-map user-ratings
    { user: principal }
    {
        total-rating: uint,
        number-of-ratings: uint,
        average-rating: uint
    }
)

(define-map disputes
    { job-id: uint }
    {
        initiator: principal,
        reason: (string-utf8 500),
        votes-release: uint,
        votes-refund: uint,
        resolved: bool
    }
)

(define-map escrow
    { job-id: uint }
    {
        amount: uint,
        locked: bool
    }
)

(define-data-var job-counter uint u0)

;; Error constants
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INVALID-JOB (err u101))
(define-constant ERR-INVALID-STATUS (err u102))
(define-constant ERR-INSUFFICIENT-FUNDS (err u103))
(define-constant ERR-ALREADY-BIDDED (err u104))
(define-constant ERR-DISPUTE-EXISTS (err u105))
