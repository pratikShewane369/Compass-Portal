import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendTransactionalEmail } from './emailService.js';

/**
 * Creates an in-app notification and dispatches an optional transactional email.
 */
export const createNotification = async ({
  recipientId,
  title,
  message,
  type = 'SYSTEM_ALERT',
  relatedJob = null,
  relatedApplication = null,
  sendEmail = true,
}) => {
  const notification = await Notification.create({
    recipient: recipientId,
    title,
    message,
    type,
    relatedJob,
    relatedApplication,
    isRead: false,
  });

  if (sendEmail) {
    try {
      const user = await User.findById(recipientId);
      if (user && user.email) {
        await sendTransactionalEmail({
          to: user.email,
          subject: `[CampusHire] ${title}`,
          text: message,
        });
      }
    } catch {
      // Never fail notification creation if email lookup fails
    }
  }

  return notification;
};
