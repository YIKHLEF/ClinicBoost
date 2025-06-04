import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, CardHeader, CardTitle, CardDescription, 
  CardContent, CardFooter 
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  MessageSquare, Phone, Users, Send, ChevronDown,
  Clock, Check, AlertTriangle, CalendarClock, MessageSquareDashed
} from 'lucide-react';

type MessageType = 'sms' | 'whatsapp' | 'email';

const Messaging: React.FC = () => {
  const { t } = useTranslation();
  const [messageType, setMessageType] = useState<MessageType>('whatsapp');
  const [messageText, setMessageText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('appointment_reminder');

  // Templates for different message types and languages
  const templates = {
    appointment_reminder: {
      name: t('messaging.appointmentReminder', 'Appointment Reminder'),
      sms: {
        en: "Hello {{patientName}}, this is a reminder about your appointment on {{date}} at {{time}}. Please confirm by replying YES or call us at {{clinicPhone}} to reschedule.",
        fr: "Bonjour {{patientName}}, ceci est un rappel pour votre rendez-vous le {{date}} à {{time}}. Veuillez confirmer en répondant OUI ou appelez-nous au {{clinicPhone}} pour reprogrammer.",
        ar: "مرحبًا {{patientName}}، هذا تذكير بموعدك يوم {{date}} في {{time}}. يرجى التأكيد بالرد بـ نعم أو الاتصال بنا على {{clinicPhone}} لإعادة جدولة الموعد."
      },
      whatsapp: {
        en: "Hello {{patientName}},\n\nThis is a friendly reminder from {{clinicName}} about your upcoming dental appointment:\n\nDate: {{date}}\nTime: {{time}}\nTreatment: {{treatment}}\n\nPlease confirm your attendance by replying to this message or call us at {{clinicPhone}} if you need to reschedule.\n\nWe look forward to seeing you soon!\n\n{{clinicName}} Team",
        fr: "Bonjour {{patientName}},\n\nCeci est un rappel amical de {{clinicName}} concernant votre prochain rendez-vous dentaire :\n\nDate : {{date}}\nHeure : {{time}}\nTraitement : {{treatment}}\n\nVeuillez confirmer votre présence en répondant à ce message ou appelez-nous au {{clinicPhone}} si vous devez reprogrammer.\n\nAu plaisir de vous voir bientôt !\n\nL'équipe {{clinicName}}",
        ar: "مرحبًا {{patientName}}،\n\nهذا تذكير ودي من {{clinicName}} بخصوص موعد طب الأسنان القادم:\n\nالتاريخ: {{date}}\nالوقت: {{time}}\nالعلاج: {{treatment}}\n\nيرجى تأكيد حضورك بالرد على هذه الرسالة أو الاتصال بنا على {{clinicPhone}} إذا كنت بحاجة إلى إعادة جدولة الموعد.\n\ننتطلع لرؤيتك قريبًا!\n\nفريق {{clinicName}}"
      },
      email: {
        en: "Subject: Appointment Reminder - {{clinicName}}\n\nDear {{patientName}},\n\nWe hope this email finds you well. This is a friendly reminder that you have a dental appointment scheduled at {{clinicName}}.\n\nAppointment Details:\n- Date: {{date}}\n- Time: {{time}}\n- Treatment: {{treatment}}\n- Dentist: Dr. {{dentistName}}\n\nPlease remember to arrive 10 minutes early to complete any necessary paperwork. If you need to reschedule, please contact us at {{clinicPhone}} at least 24 hours in advance.\n\nWe look forward to seeing you soon!\n\nBest regards,\nThe {{clinicName}} Team",
        fr: "Objet : Rappel de rendez-vous - {{clinicName}}\n\nCher(e) {{patientName}},\n\nNous espérons que ce courriel vous trouve bien. Ceci est un rappel amical que vous avez un rendez-vous dentaire prévu à {{clinicName}}.\n\nDétails du rendez-vous :\n- Date : {{date}}\n- Heure : {{time}}\n- Traitement : {{treatment}}\n- Dentiste : Dr. {{dentistName}}\n\nVeuillez vous présenter 10 minutes à l'avance pour remplir les formalités nécessaires. Si vous devez reprogrammer, veuillez nous contacter au {{clinicPhone}} au moins 24 heures à l'avance.\n\nAu plaisir de vous voir bientôt !\n\nCordialement,\nL'équipe {{clinicName}}",
        ar: "الموضوع: تذكير بالموعد - {{clinicName}}\n\nعزيزي {{patientName}}،\n\nنأمل أن تصلك هذه الرسالة وأنت بخير. هذا تذكير ودي بأن لديك موعدًا لطب الأسنان محددًا في {{clinicName}}.\n\nتفاصيل الموعد:\n- التاريخ: {{date}}\n- الوقت: {{time}}\n- العلاج: {{treatment}}\n- طبيب الأسنان: د. {{dentistName}}\n\nيرجى الوصول قبل 10 دقائق لإكمال أي أوراق ضرورية. إذا كنت بحاجة إلى إعادة جدولة الموعد، يرجى الاتصال بنا على {{clinicPhone}} قبل 24 ساعة على الأقل.\n\nنتطلع لرؤيتك قريبًا!\n\nمع أطيب التحيات،\nفريق {{clinicName}}"
      }
    },
    treatment_followup: {
      name: t('messaging.treatmentFollowup', 'Treatment Follow-up'),
      sms: {
        en: "Hi {{patientName}}, how are you feeling after your {{treatment}} at {{clinicName}}? Please contact us if you have any concerns.",
        fr: "Bonjour {{patientName}}, comment vous sentez-vous après votre {{treatment}} chez {{clinicName}} ? N'hésitez pas à nous contacter si vous avez des préoccupations.",
        ar: "مرحبًا {{patientName}}، كيف تشعر بعد {{treatment}} في {{clinicName}}؟ يرجى الاتصال بنا إذا كانت لديك أية مخاوف."
      },
      whatsapp: {
        en: "Hello {{patientName}},\n\nWe hope you're doing well after your recent {{treatment}} treatment at {{clinicName}}.\n\nWe wanted to check in and see how you're feeling. Are you experiencing any discomfort or do you have any questions about your treatment?\n\nYour feedback is important to us, and we're here to address any concerns you might have.\n\nBest regards,\nDr. {{dentistName}}\n{{clinicName}}",
        fr: "Bonjour {{patientName}},\n\nNous espérons que vous vous portez bien après votre récent traitement de {{treatment}} chez {{clinicName}}.\n\nNous voulions prendre de vos nouvelles et savoir comment vous vous sentez. Ressentez-vous un inconfort ou avez-vous des questions concernant votre traitement ?\n\nVotre retour est important pour nous, et nous sommes là pour répondre à toutes vos préoccupations.\n\nCordialement,\nDr. {{dentistName}}\n{{clinicName}}",
        ar: "مرحبًا {{patientName}}،\n\nنأمل أن تكون بخير بعد علاج {{treatment}} الأخير في {{clinicName}}.\n\nأردنا الاطمئنان عليك ومعرفة كيف تشعر. هل تعاني من أي انزعاج أو لديك أية أسئلة حول العلاج؟\n\nملاحظاتك مهمة بالنسبة لنا، ونحن هنا لمعالجة أي مخاوف قد تكون لديك.\n\nمع أطيب التحيات،\nد. {{dentistName}}\n{{clinicName}}"
      },
      email: {
        en: "Subject: Follow-up on Your Recent Treatment - {{clinicName}}\n\nDear {{patientName}},\n\nWe hope this email finds you well. We wanted to follow up on your recent {{treatment}} procedure at {{clinicName}} on {{date}}.\n\nIt's important for us to ensure that your recovery is proceeding smoothly. Please let us know if you're experiencing any of the following:\n- Persistent pain or discomfort\n- Swelling that hasn't reduced\n- Any concerns about the treatment area\n\nYour oral health is our priority, and we're here to address any questions or concerns you might have. Feel free to reply to this email or call us at {{clinicPhone}}.\n\nBest regards,\nDr. {{dentistName}}\n{{clinicName}}",
        fr: "Objet : Suivi de votre traitement récent - {{clinicName}}\n\nCher(e) {{patientName}},\n\nNous espérons que ce courriel vous trouve bien. Nous voulions faire un suivi de votre récente procédure de {{treatment}} chez {{clinicName}} le {{date}}.\n\nIl est important pour nous de nous assurer que votre récupération se déroule bien. Veuillez nous informer si vous ressentez l'un des éléments suivants :\n- Douleur ou inconfort persistant\n- Gonflement qui n'a pas diminué\n- Tout autre souci concernant la zone traitée\n\nVotre santé bucco-dentaire est notre priorité, et nous sommes là pour répondre à toutes vos questions ou préoccupations. N'hésitez pas à répondre à ce courriel ou à nous appeler au {{clinicPhone}}.\n\nCordialement,\nDr. {{dentistName}}\n{{clinicName}}",
        ar: "الموضوع: متابعة علاجك الأخير - {{clinicName}}\n\nعزيزي {{patientName}}،\n\nنأمل أن تصلك هذه الرسالة وأنت بخير. أردنا متابعة إجراء {{treatment}} الأخير في {{clinicName}} بتاريخ {{date}}.\n\nمن المهم بالنسبة لنا التأكد من أن تعافيك يسير بسلاسة. يرجى إعلامنا إذا كنت تعاني من أي مما يلي:\n- ألم أو انزعاج مستمر\n- تورم لم ينخفض\n- أي مخاوف بشأن منطقة العلاج\n\nصحة الفم لديك هي أولويتنا، ونحن هنا للإجابة على أي أسئلة أو مخاوف قد تكون لديك. لا تتردد في الرد على هذا البريد الإلكتروني أو الاتصال بنا على {{clinicPhone}}.\n\nمع أطيب التحيات،\nد. {{dentistName}}\n{{clinicName}}"
      }
    }
  };
  
  // Get current template text based on selection and message type
  const getTemplateText = () => {
    if (!selectedTemplate) return '';
    
    const template = templates[selectedTemplate as keyof typeof templates];
    if (!template) return '';
    
    const messageTypeTemplates = template[messageType as keyof typeof template];
    if (!messageTypeTemplates) return '';
    
    // For demonstration, we'll use the language from i18n
    const { i18n } = useTranslation();
    const lang = i18n.language as keyof typeof messageTypeTemplates;
    
    // Default to English if the language is not available
    return messageTypeTemplates[lang] || messageTypeTemplates.en;
  };
  
  // When template is selected, update message text
  React.useEffect(() => {
    if (selectedTemplate) {
      setMessageText(getTemplateText());
    }
  }, [selectedTemplate, messageType]);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('messaging.title')}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Message Card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('messaging.compose')}</CardTitle>
              <CardDescription>
                {t('messaging.composeDescription', 'Create and send messages to your patients')}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* Message type selector */}
              <div className="flex space-x-4 mb-6">
                <button
                  className={`flex items-center px-4 py-2 rounded-md ${messageType === 'sms' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  onClick={() => setMessageType('sms')}
                >
                  <Phone size={18} className="mr-2" />
                  {t('messaging.smsMessage')}
                </button>
                <button
                  className={`flex items-center px-4 py-2 rounded-md ${messageType === 'whatsapp' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  onClick={() => setMessageType('whatsapp')}
                >
                  <MessageSquare size={18} className="mr-2" />
                  {t('messaging.whatsAppMessage')}
                </button>
                <button
                  className={`flex items-center px-4 py-2 rounded-md ${messageType === 'email' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  onClick={() => setMessageType('email')}
                >
                  <MessageSquare size={18} className="mr-2" />
                  {t('messaging.emailMessage')}
                </button>
              </div>
              
              {/* Recipients selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('messaging.selectPatients')}
                </label>
                <div className="relative">
                  <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 px-3 py-2">
                    <Users size={18} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">3 {t('patients.selected', 'patients selected')}</span>
                    <button className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <ChevronDown size={18} />
                    </button>
                  </div>
                </div>
                
                {/* Patient tags */}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                    Mohammed Karimi
                    <button className="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                      <X size={14} />
                    </button>
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                    Fatima Benali
                    <button className="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                      <X size={14} />
                    </button>
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                    Omar Saidi
                    <button className="ml-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300">
                      <X size={14} />
                    </button>
                  </span>
                </div>
              </div>
              
              {/* Template selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('messaging.selectTemplate')}
                </label>
                <div className="relative">
                  <select 
                    className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    <option value="appointment_reminder">
                      {t('messaging.appointmentReminder', 'Appointment Reminder')}
                    </option>
                    <option value="treatment_followup">
                      {t('messaging.treatmentFollowup', 'Treatment Follow-up')}
                    </option>
                  </select>
                </div>
              </div>
              
              {/* Message content */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('messaging.messageContent')}
                </label>
                <textarea
                  rows={8}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('messaging.variablesInfo', 'Use {{variableName}} for personalized fields')}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('messaging.sendOptions', 'Send Options')}
                  </label>
                  <div className="flex space-x-4">
                    <button className="flex items-center px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-650">
                      <Clock size={16} className="mr-2" />
                      {t('messaging.schedule')}
                    </button>
                    <button className="flex items-center px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-650">
                      <Eye size={16} className="mr-2" />
                      {t('messaging.preview')}
                    </button>
                  </div>
                </div>
                
                <Button className="sm:self-end">
                  <Send size={16} className="mr-2" />
                  {t('messaging.send')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Message Stats & Recent Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('messaging.stats')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-3xl font-bold text-primary-500">85%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('messaging.deliveryRate')}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-3xl font-bold text-secondary-500">42%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('messaging.responseRate')}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('messaging.messagesByType')}
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: '45%' }}></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">45% SMS</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: '35%' }}></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">35% WhatsApp</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full" style={{ width: '20%' }}></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">20% Email</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>{t('messaging.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('messaging.appointmentConfirmed')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Mohammed Karimi - 15 {t('common.minutesAgo')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('messaging.requestReschedule')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Fatima Benali - 45 {t('common.minutesAgo')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('messaging.campaignCompleted')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('messaging.sentTo', 'Sent to')} 27 {t('patients.patients')} - 2h {t('common.ago')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <CalendarClock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('messaging.recallScheduled')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      12 {t('patients.patients')} - {t('common.tomorrow')} 09:00
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Messaging;