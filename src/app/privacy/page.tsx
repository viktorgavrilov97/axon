import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика конфиденциальности | Axon",
  description: "Политика конфиденциальности платформы Axon",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface-900 text-white-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-largetitle mb-8">Политика конфиденциальности</h1>
        
        <div className="space-y-6 text-body text-white-800">
          <section>
            <p className="text-small text-white-600 mb-4">
              <strong>Дата вступления в силу:</strong> {new Date().toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p>
              Настоящая Политика конфиденциальности описывает, как платформа Axon (&quot;мы&quot;, &quot;наш&quot;, &quot;нас&quot;) собирает, использует и защищает вашу личную информацию при использовании нашего сервиса.
            </p>
          </section>

          <section>
            <h2 className="text-heading text-white-900 mb-4">1. Сбор информации</h2>
            <p className="mb-2">
              Мы собираем следующую информацию:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Адрес электронной почты</li>
              <li>Информация о транзакциях и операциях</li>
              <li>Техническая информация (IP-адрес, тип браузера, устройство)</li>
              <li>Информация, предоставленная при регистрации и использовании сервиса</li>
            </ul>
          </section>

          <section>
            <h2 className="text-heading text-white-900 mb-4">2. Использование информации</h2>
            <p className="mb-2">
              Мы используем собранную информацию для:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Предоставления и улучшения наших услуг</li>
              <li>Обработки транзакций и операций</li>
              <li>Связи с вами по вопросам сервиса</li>
              <li>Обеспечения безопасности и предотвращения мошенничества</li>
              <li>Соблюдения юридических обязательств</li>
            </ul>
          </section>

          <section>
            <h2 className="text-heading text-white-900 mb-4">3. Защита данных</h2>
            <p>
              Мы применяем современные методы защиты данных, включая шифрование, безопасные протоколы передачи данных и ограниченный доступ к персональной информации. Однако ни один метод передачи данных через интернет не является абсолютно безопасным.
            </p>
          </section>

          <section>
            <h2 className="text-heading text-white-900 mb-4">4. Раскрытие информации третьим лицам</h2>
            <p className="mb-2">
              Мы не продаем и не передаем вашу личную информацию третьим лицам, за исключением случаев:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Когда это необходимо для предоставления услуг (например, платежные провайдеры)</li>
              <li>Когда это требуется по закону или по запросу государственных органов</li>
              <li>Для защиты наших прав и безопасности</li>
            </ul>
          </section>

          <section>
            <h2 className="text-heading text-white-900 mb-4">5. Ваши права</h2>
            <p className="mb-2">
              Вы имеете право:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Получать доступ к вашей личной информации</li>
              <li>Исправлять неточную информацию</li>
              <li>Удалять вашу учетную запись и данные</li>
              <li>Отозвать согласие на обработку данных</li>
            </ul>
          </section>

          <section>
            <h2 className="text-heading text-white-900 mb-4">6. Возрастные ограничения</h2>
            <p>
              Наш сервис предназначен для лиц, достигших 18 лет. Создавая учетную запись, вы подтверждаете, что вам исполнилось 18 лет.
            </p>
          </section>

          <section>
            <h2 className="text-heading text-white-900 mb-4">7. Изменения в политике</h2>
            <p>
              Мы оставляем за собой право изменять настоящую Политику конфиденциальности. О существенных изменениях мы уведомим вас через наш сервис или по электронной почте.
            </p>
          </section>

          <section>
            <h2 className="text-heading text-white-900 mb-4">8. Контакты</h2>
            <p>
              Если у вас есть вопросы относительно настоящей Политики конфиденциальности, пожалуйста, свяжитесь с нами через наш сервис.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

