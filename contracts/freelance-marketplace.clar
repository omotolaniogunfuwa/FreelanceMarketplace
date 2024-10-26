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

;; Job Management Functions

(define-public (post-job (title (string-utf8 100)) (description (string-utf8 500)) (budget uint) (milestones (list 10 uint)))
    (let
        (
            (job-id (+ (var-get job-counter) u1))
        )
        (try! (stx-transfer? budget tx-sender (as-contract tx-sender)))
        (map-set jobs
            { job-id: job-id }
            {
                client: tx-sender,
                title: title,
                description: description,
                budget: budget,
                status: "open",
                freelancer: none,
                milestones: milestones,
                current-milestone: u0
            }
        )
        (var-set job-counter job-id)
        (map-set escrow
            { job-id: job-id }
            {
                amount: budget,
                locked: true
            }
        )
        (ok job-id)
    )
)

(define-public (place-bid (job-id uint) (amount uint) (proposal (string-utf8 500)))
    (let
        (
            (job (unwrap! (map-get? jobs { job-id: job-id }) (err u404)))
        )
        (asserts! (is-eq (get status job) "open") ERR-INVALID-STATUS)
        (asserts! (is-none (map-get? bids { job-id: job-id, bidder: tx-sender })) ERR-ALREADY-BIDDED)

        (map-set bids
            { job-id: job-id, bidder: tx-sender }
            {
                amount: amount,
                proposal: proposal,
                status: "pending"
            }
        )
        (ok true)
    )
)

(define-public (accept-bid (job-id uint) (freelancer principal))
    (let
        (
            (job (unwrap! (map-get? jobs { job-id: job-id }) (err u404)))
            (bid (unwrap! (map-get? bids { job-id: job-id, bidder: freelancer }) (err u404)))
        )
        (asserts! (is-eq tx-sender (get client job)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status job) "open") ERR-INVALID-STATUS)

        (map-set jobs
            { job-id: job-id }
            (merge job {
                status: "in-progress",
                freelancer: (some freelancer)
            })
        )
        (map-set bids
            { job-id: job-id, bidder: freelancer }
            (merge bid { status: "accepted" })
        )
        (ok true)
    )
)

;; Milestone and Payment Functions

(define-public (complete-milestone (job-id uint))
    (let
        (
            (job (unwrap! (map-get? jobs { job-id: job-id }) (err u404)))
            (escrow-data (unwrap! (map-get? escrow { job-id: job-id }) (err u404)))
            (milestone-amount (unwrap! (element-at (get milestones job) (get current-milestone job)) (err u404)))
        )
        (asserts! (is-eq tx-sender (get client job)) ERR-NOT-AUTHORIZED)
        (asserts! (is-eq (get status job) "in-progress") ERR-INVALID-STATUS)

        ;; Release milestone payment to freelancer
        (try! (as-contract (stx-transfer? milestone-amount tx-sender (unwrap! (get freelancer job) ERR-NOT-AUTHORIZED))))

        ;; Update job state
        (map-set jobs
            { job-id: job-id }
            (merge job {
                current-milestone: (+ (get current-milestone job) u1)
            })
        )

        ;; Check if this was the last milestone
        (if (is-eq (+ (get current-milestone job) u1) (len (get milestones job)))
            (map-set jobs
                { job-id: job-id }
                (merge job {
                    status: "completed",
                    current-milestone: (+ (get current-milestone job) u1)
                })
            )
            true
        )
        (ok true)
    )
)

;; Dispute Resolution Functions

(define-public (raise-dispute (job-id uint) (reason (string-utf8 500)))
    (let
        (
            (job (unwrap! (map-get? jobs { job-id: job-id }) (err u404)))
        )
        (asserts! (or
            (is-eq tx-sender (get client job))
            (is-eq tx-sender (unwrap! (get freelancer job) ERR-NOT-AUTHORIZED))
        ) ERR-NOT-AUTHORIZED)
        (asserts! (is-none (map-get? disputes { job-id: job-id })) ERR-DISPUTE-EXISTS)

        (map-set disputes
            { job-id: job-id }
            {
                initiator: tx-sender,
                reason: reason,
                votes-release: u0,
                votes-refund: u0,
                resolved: false
            }
        )
        (map-set jobs
            { job-id: job-id }
            (merge job { status: "disputed" })
        )
        (ok true)
    )
)

(define-public (vote-on-dispute (job-id uint) (vote-release bool))
    (let
        (
            (dispute (unwrap! (map-get? disputes { job-id: job-id }) (err u404)))
        )
        (asserts! (not (get resolved dispute)) ERR-INVALID-STATUS)

        (map-set disputes
            { job-id: job-id }
            (merge dispute {
                votes-release: (if vote-release (+ (get votes-release dispute) u1) (get votes-release dispute)),
                votes-refund: (if (not vote-release) (+ (get votes-refund dispute) u1) (get votes-refund dispute))
            })
        )
        (ok true)
    )
)

;; Rating System Functions

(define-public (rate-user (user principal) (rating uint))
    (let
        (
            (current-rating (default-to
                { total-rating: u0, number-of-ratings: u0, average-rating: u0 }
                (map-get? user-ratings { user: user })
            ))
        )
        (asserts! (and (>= rating u1) (<= rating u5)) (err u106))

        (map-set user-ratings
            { user: user }
            {
                total-rating: (+ (get total-rating current-rating) rating),
                number-of-ratings: (+ (get number-of-ratings current-rating) u1),
                average-rating: (/ (+ (get total-rating current-rating) rating)
                                 (+ (get number-of-ratings current-rating) u1))
            }
        )
        (ok true)
    )
)
