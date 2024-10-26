import { describe, expect, it, beforeEach } from 'vitest';
import {
  Client,
  Provider,
  Receipt,
  Result,
  Transaction
} from '@stacks/stacks-blockchain-api-types';
import {
  commonPrincipalCV,
  stringUtf8CV,
  uintCV,
  listCV,
  someCV,
  noneCV,
  trueCV,
  falseCV
} from '@stacks/transactions';

describe('Freelance Marketplace Contract', () => {
  let client: Client;
  let provider: Provider;
  let deployer: string;
  let clientUser: string;
  let freelancer: string;
  let voter1: string;
  let voter2: string;
  
  beforeEach(async () => {
    // Setup test environment
    provider = await Provider.mockNet();
    client = new Client(provider);
    
    // Initialize test accounts
    deployer = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    clientUser = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG";
    freelancer = "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC";
    voter1 = "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND";
    voter2 = "ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB";
  });
  
  describe('Job Posting', () => {
    it('should successfully post a job', async () => {
      const title = stringUtf8CV("Web Development Project");
      const description = stringUtf8CV("Build a responsive website");
      const budget = uintCV(1000);
      const milestones = listCV([uintCV(500), uintCV(500)]);
      
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "post-job",
        functionArgs: [title, description, budget, milestones],
        senderAddress: clientUser,
      });
      
      expect(receipt.success).toBe(true);
      
      // Verify job details
      const jobDetails = await client.callReadOnly({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "get-job-details",
        functionArgs: [uintCV(1)],
      });
      
      const job = jobDetails.value;
      expect(job.client).toBe(clientUser);
      expect(job.status).toBe("open");
      expect(job.budget).toBe(1000);
    });
    
    it('should fail to post job with insufficient funds', async () => {
      const title = stringUtf8CV("High Budget Project");
      const description = stringUtf8CV("Complex Project");
      const budget = uintCV(1000000); // More than available balance
      const milestones = listCV([uintCV(500000), uintCV(500000)]);
      
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "post-job",
        functionArgs: [title, description, budget, milestones],
        senderAddress: clientUser,
      });
      
      expect(receipt.success).toBe(false);
      expect(receipt.error).toContain("ERR-INSUFFICIENT-FUNDS");
    });
  });
  
  describe('Bidding System', () => {
    beforeEach(async () => {
      // Post a job for testing bids
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "post-job",
        functionArgs: [
          stringUtf8CV("Test Job"),
          stringUtf8CV("Test Description"),
          uintCV(1000),
          listCV([uintCV(500), uintCV(500)])
        ],
        senderAddress: clientUser,
      });
    });
    
    it('should successfully place a bid', async () => {
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "place-bid",
        functionArgs: [
          uintCV(1), // job-id
          uintCV(900), // amount
          stringUtf8CV("I can do this project") // proposal
        ],
        senderAddress: freelancer,
      });
      
      expect(receipt.success).toBe(true);
      
      // Verify bid details
      const bidDetails = await client.callReadOnly({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "get-bids-for-job",
        functionArgs: [uintCV(1)],
      });
      
      const bid = bidDetails.value;
      expect(bid.amount).toBe(900);
      expect(bid.status).toBe("pending");
    });
    
    it('should prevent multiple bids from same freelancer', async () => {
      // Place first bid
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "place-bid",
        functionArgs: [uintCV(1), uintCV(900), stringUtf8CV("First bid")],
        senderAddress: freelancer,
      });
      
      // Attempt second bid
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "place-bid",
        functionArgs: [uintCV(1), uintCV(800), stringUtf8CV("Second bid")],
        senderAddress: freelancer,
      });
      
      expect(receipt.success).toBe(false);
      expect(receipt.error).toContain("ERR-ALREADY-BIDDED");
    });
  });
  
  describe('Milestone and Payment System', () => {
    beforeEach(async () => {
      // Setup a job with accepted bid
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "post-job",
        functionArgs: [
          stringUtf8CV("Milestone Test Job"),
          stringUtf8CV("Test Description"),
          uintCV(1000),
          listCV([uintCV(500), uintCV(500)])
        ],
        senderAddress: clientUser,
      });
      
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "place-bid",
        functionArgs: [uintCV(1), uintCV(1000), stringUtf8CV("Proposal")],
        senderAddress: freelancer,
      });
      
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "accept-bid",
        functionArgs: [uintCV(1), commonPrincipalCV(freelancer)],
        senderAddress: clientUser,
      });
    });
    
    it('should complete milestone and release payment', async () => {
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "complete-milestone",
        functionArgs: [uintCV(1)],
        senderAddress: clientUser,
      });
      
      expect(receipt.success).toBe(true);
      
      // Verify milestone completion
      const jobDetails = await client.callReadOnly({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "get-job-details",
        functionArgs: [uintCV(1)],
      });
      
      const job = jobDetails.value;
      expect(job.current_milestone).toBe(1);
      expect(job.status).toBe("in-progress");
    });
  });
  
  describe('Dispute Resolution', () => {
    beforeEach(async () => {
      // Setup a job in progress
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "post-job",
        functionArgs: [
          stringUtf8CV("Dispute Test Job"),
          stringUtf8CV("Test Description"),
          uintCV(1000),
          listCV([uintCV(1000)])
        ],
        senderAddress: clientUser,
      });
      
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "place-bid",
        functionArgs: [uintCV(1), uintCV(1000), stringUtf8CV("Proposal")],
        senderAddress: freelancer,
      });
      
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "accept-bid",
        functionArgs: [uintCV(1), commonPrincipalCV(freelancer)],
        senderAddress: clientUser,
      });
    });
    
    it('should raise dispute successfully', async () => {
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "raise-dispute",
        functionArgs: [
          uintCV(1),
          stringUtf8CV("Work not meeting requirements")
        ],
        senderAddress: clientUser,
      });
      
      expect(receipt.success).toBe(true);
      
      // Verify dispute status
      const disputeDetails = await client.callReadOnly({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "get-dispute-details",
        functionArgs: [uintCV(1)],
      });
      
      const dispute = disputeDetails.value;
      expect(dispute.resolved).toBe(false);
      expect(dispute.initiator).toBe(clientUser);
    });
    
    it('should allow voting on disputes', async () => {
      // First raise a dispute
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "raise-dispute",
        functionArgs: [uintCV(1), stringUtf8CV("Dispute reason")],
        senderAddress: clientUser,
      });
      
      // Vote on dispute
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "vote-on-dispute",
        functionArgs: [uintCV(1), trueCV()],
        senderAddress: voter1,
      });
      
      expect(receipt.success).toBe(true);
      
      // Verify vote count
      const disputeDetails = await client.callReadOnly({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "get-dispute-details",
        functionArgs: [uintCV(1)],
      });
      
      const dispute = disputeDetails.value;
      expect(dispute.votes_release).toBe(1);
      expect(dispute.votes_refund).toBe(0);
    });
  });
  
  describe('Rating System', () => {
    it('should successfully rate a user', async () => {
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "rate-user",
        functionArgs: [
          commonPrincipalCV(freelancer),
          uintCV(5)
        ],
        senderAddress: clientUser,
      });
      
      expect(receipt.success).toBe(true);
      
      // Verify rating
      const ratingDetails = await client.callReadOnly({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "get-user-rating",
        functionArgs: [commonPrincipalCV(freelancer)],
      });
      
      const rating = ratingDetails.value;
      expect(rating.total_rating).toBe(5);
      expect(rating.number_of_ratings).toBe(1);
      expect(rating.average_rating).toBe(5);
    });
    
    it('should maintain correct average with multiple ratings', async () => {
      // First rating
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "rate-user",
        functionArgs: [commonPrincipalCV(freelancer), uintCV(5)],
        senderAddress: clientUser,
      });
      
      // Second rating
      await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "rate-user",
        functionArgs: [commonPrincipalCV(freelancer), uintCV(3)],
        senderAddress: voter1,
      });
      
      // Verify final rating
      const ratingDetails = await client.callReadOnly({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "get-user-rating",
        functionArgs: [commonPrincipalCV(freelancer)],
      });
      
      const rating = ratingDetails.value;
      expect(rating.total_rating).toBe(8);
      expect(rating.number_of_ratings).toBe(2);
      expect(rating.average_rating).toBe(4);
    });
    
    it('should reject invalid rating values', async () => {
      const receipt = await client.submitTransaction({
        contractAddress: deployer,
        contractName: "freelance-marketplace",
        functionName: "rate-user",
        functionArgs: [commonPrincipalCV(freelancer), uintCV(6)],
        senderAddress: clientUser,
      });
      
      expect(receipt.success).toBe(false);
      expect(receipt.error).toContain("u106"); // Invalid rating error
    });
  });
});
