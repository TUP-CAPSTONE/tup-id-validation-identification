import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { studentEmail, guardianEmail, studentName } = await request.json();

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(studentEmail) || !emailRegex.test(guardianEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Generate verification codes
    const studentCode = generateVerificationCode();
    const guardianCode = generateVerificationCode();

    // Configure nodemailer transporter
    // You'll need to set up environment variables for email service
    const transporter = nodemailer.createTransport({
      service: 'gmail', // or your email service
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASSWORD, // Your email password or app password
      },
    });

    // Send verification email to student
    try {
      console.log('Attempting to send email to student:', studentEmail);
      console.log('Using email credentials:', process.env.EMAIL_USER ? 'Set' : 'NOT SET');
      
      await transporter.sendMail({
        from: `"TUP SIIVS" <${process.env.EMAIL_USER}>`,
        to: studentEmail,
        subject: 'Email Verification - TUP Student Registration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #b32032;">TUP Student Registration</h2>
            <p>Hello ${studentName},</p>
            <p>Thank you for registering. Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${studentCode}
            </div>
            <p>Please enter this code on the registration page to verify your email address.</p>
            <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes.</p>
            <p>If you did not request this verification, please ignore this email.</p>
          </div>
        `,
      });
      console.log('Student email sent successfully');
    } catch (error: any) {
      console.error('Error sending student email:', error);
      const errorMsg = error?.message || 'Unknown error';
      return NextResponse.json(
        { error: `Failed to send verification to student email: ${errorMsg}. Check server console for details.` },
        { status: 500 }
      );
    }

    // Send verification email to guardian
    try {
      console.log('Attempting to send email to guardian:', guardianEmail);
      
      await transporter.sendMail({
        from: `"TUP SIIVS" <${process.env.EMAIL_USER}>`,
        to: guardianEmail,
        subject: 'Email Verification - Student Registration Confirmation',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #b32032;">Student Registration Confirmation</h2>
            <p>Hello,</p>
            <p>${studentName} has listed you as their guardian in their TUP student registration. Your verification code is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${guardianCode}
            </div>
            <p>Please provide this code to the student to complete their registration.</p>
            <p style="color: #666; font-size: 12px;">This code will expire in 10 minutes.</p>
            <p>If you did not expect this email or do not know this student, please contact the TUP administration.</p>
          </div>
        `,
      });
      console.log('Guardian email sent successfully');
    } catch (error: any) {
      console.error('Error sending guardian email:', error);
      const errorMsg = error?.message || 'Unknown error';
      return NextResponse.json(
        { error: `Failed to send verification to guardian email: ${errorMsg}. Check server console for details.` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      studentCode,
      guardianCode,
      message: 'Verification codes sent successfully'
    });

  } catch (error) {
    console.error('Verification email error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification codes' },
      { status: 500 }
    );
  }
}
